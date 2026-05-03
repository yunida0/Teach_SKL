<?php
require_once __DIR__ . '/../../config/database.php';

function wants_json_response(): bool {
    // Dipanggil dari React fetch, tapi tetap disiapkan fallback redirect
    // supaya pola endpoint PHP lama tidak langsung rusak.
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return stripos($accept, 'application/json') !== false || strtolower($requestedWith) === 'fetch';
}

function ebook_update_error(string $message, int $code = 400): void {
    if (wants_json_response()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&error=' . urlencode($message));
    exit;
}

function ebook_update_success(string $message): void {
    if (wants_json_response()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'message' => $message]);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&success=' . urlencode($message));
    exit;
}

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    ebook_update_error('Akses ditolak', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ebook_update_error('Metode tidak valid', 405);
}

csrf_verify();

$id = (int) ($_POST['id'] ?? 0);
$pelajaran = trim($_POST['pelajaran'] ?? '');
$judul = trim($_POST['judul_materi'] ?? '');
$deskripsi = trim($_POST['deskripsi'] ?? '');
$tujuan = trim($_POST['tujuan_pembelajaran'] ?? '');
$tingkat = trim($_POST['tingkat'] ?? 'Umum');
$estimasiMenit = max(0, (int) ($_POST['estimasi_menit'] ?? 0));
$tagRaw = trim($_POST['tags'] ?? '');
$tags = implode(', ', array_slice(array_filter(array_map('trim', preg_split('/[,#]+/', $tagRaw))), 0, 8));

$errors = collect_errors([
    $id <= 0 ? 'ID materi tidak valid' : null,
    validate_required($pelajaran, 'Pelajaran'),
    validate_required($judul, 'Judul materi'),
    validate_length($judul, 'Judul materi', 1, 200),
    validate_length($deskripsi, 'Deskripsi', 0, 1200),
    validate_length($tujuan, 'Tujuan pembelajaran', 0, 800),
    validate_length($tingkat, 'Tingkat', 1, 80),
    validate_length($tagRaw, 'Tag', 0, 200),
]);

if ($errors) ebook_update_error(implode('. ', $errors));

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
        }
    }

    $stmt = $pdo->prepare('UPDATE ebook SET pelajaran = ?, judul_materi = ?, deskripsi = ?, tujuan_pembelajaran = ?, tingkat = ?, estimasi_menit = ?, tags = ? WHERE id = ?');
    $stmt->execute([$pelajaran, $judul, $deskripsi, $tujuan, $tingkat, $estimasiMenit, $tags, $id]);
} catch (Exception $e) {
    ebook_update_error('Gagal menyimpan perubahan materi', 500);
}

ebook_update_success('Materi berhasil diperbarui');
?>
