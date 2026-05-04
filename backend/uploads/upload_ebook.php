<?php
require_once __DIR__ . '/../../config/database.php';

function wants_json_response(): bool {
    // Endpoint ini masih melayani dua cara pakai:
    // form PHP lama butuh redirect, frontend Next.js butuh JSON.
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return stripos($accept, 'application/json') !== false || strtolower($requestedWith) === 'fetch';
}

function ebook_error(string $message, int $code = 400): void {
    if (wants_json_response()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&error=' . urlencode($message));
    exit;
}

function ebook_success(string $message, array $extra = []): void {
    if (wants_json_response()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'message' => $message] + $extra);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&success=' . urlencode($message));
    exit;
}

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    ebook_error('Akses ditolak', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ebook_error('Metode tidak valid', 405);
}

$csrfToken = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
    ebook_error('Sesi keamanan kadaluarsa. Refresh halaman lalu coba upload lagi.', 403);
}

$pelajaran = trim($_POST['pelajaran'] ?? '');
$judul = trim($_POST['judul_materi'] ?? '');
$deskripsi = trim($_POST['deskripsi'] ?? '');
$tujuan = trim($_POST['tujuan_pembelajaran'] ?? '');
$tingkat = trim($_POST['tingkat'] ?? 'Umum');
$estimasiMenit = max(0, (int) ($_POST['estimasi_menit'] ?? 0));
$tagRaw = trim($_POST['tags'] ?? '');
$uploadedBy = (int) $_SESSION['user']['id'];

// Validate inputs
$errors = collect_errors([
    validate_required($pelajaran, 'Pelajaran'),
    validate_required($judul, 'Judul materi'),
    validate_length($judul, 'Judul materi', 1, 200),
    validate_length($deskripsi, 'Deskripsi', 0, 1200),
    validate_length($tujuan, 'Tujuan pembelajaran', 0, 800),
    validate_length($tingkat, 'Tingkat', 1, 80),
    validate_length($tagRaw, 'Tag', 0, 200),
    empty($_FILES['file']['name']) ? 'File wajib diupload' : null
]);

if ($errors) ebook_error(implode('. ', $errors));

$tags = implode(', ', array_slice(array_filter(array_map('trim', preg_split('/[,#]+/', $tagRaw))), 0, 8));

$uploadDir = __DIR__ . '/../../uploads/ebook/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
if (!is_writable($uploadDir)) {
    ebook_error('Folder upload ebook tidak bisa ditulis');
}

$allowedExt = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
$allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-office',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
$maxFileSize = 25 * 1024 * 1024; // 25MB

if (!isset($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE => 'File melebihi batas upload server. Naikkan upload_max_filesize/post_max_size di php.ini.',
        UPLOAD_ERR_FORM_SIZE => 'File melebihi batas form upload.',
        UPLOAD_ERR_PARTIAL => 'File hanya terupload sebagian. Coba ulangi.',
        UPLOAD_ERR_NO_FILE => 'File wajib diupload.',
        UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary upload server tidak tersedia.',
        UPLOAD_ERR_CANT_WRITE => 'Server gagal menulis file upload.',
        UPLOAD_ERR_EXTENSION => 'Upload diblokir ekstensi PHP.',
    ];
    ebook_error($uploadErrors[$_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE] ?? 'Upload file gagal.');
}

$errors = collect_errors([
    validate_file_extension($_FILES['file']['name'], 'File', $allowedExt),
    validate_file_size($_FILES['file']['size'], 'File', $maxFileSize)
]);

if ($errors) ebook_error(implode('. ', $errors));

$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
$safeName = uniqid('materi_', true) . '.' . $ext;
$filePath = 'uploads/ebook/' . $safeName;
$targetPath = $uploadDir . $safeName;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    ebook_error('Gagal mengunggah file');
}

// Validate MIME type after upload
$mimeError = validate_mime_type($targetPath, 'File', $allowedMimeTypes);
if ($mimeError) {
    unlink($targetPath);
    ebook_error($mimeError);
}

try {
    $columns = $pdo->query('SHOW COLUMNS FROM ebook')->fetchAll(PDO::FETCH_COLUMN);
    $existing = array_flip($columns);
    $optionalDefinitions = [
        'deskripsi' => 'ALTER TABLE ebook ADD COLUMN deskripsi TEXT NULL AFTER judul_materi',
        'tujuan_pembelajaran' => 'ALTER TABLE ebook ADD COLUMN tujuan_pembelajaran TEXT NULL AFTER deskripsi',
        'tingkat' => "ALTER TABLE ebook ADD COLUMN tingkat VARCHAR(80) NULL DEFAULT 'Umum' AFTER tujuan_pembelajaran",
        'estimasi_menit' => 'ALTER TABLE ebook ADD COLUMN estimasi_menit INT NULL DEFAULT 0 AFTER tingkat',
        'tags' => 'ALTER TABLE ebook ADD COLUMN tags VARCHAR(200) NULL AFTER estimasi_menit',
    ];
    foreach ($optionalDefinitions as $column => $sql) {
        if (!isset($existing[$column])) {
            $pdo->exec($sql);
            $existing[$column] = true;
        }
    }

    $stmt = $pdo->prepare('INSERT INTO ebook (pelajaran, judul_materi, deskripsi, tujuan_pembelajaran, tingkat, estimasi_menit, tags, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$pelajaran, $judul, $deskripsi, $tujuan, $tingkat, $estimasiMenit, $tags, $filePath, $uploadedBy]);
} catch (Exception $e) {
    if (file_exists($targetPath)) unlink($targetPath);
    ebook_error('Gagal menyimpan data materi');
}

ebook_success('Materi berhasil diupload', ['file_path' => $filePath]);
?>
