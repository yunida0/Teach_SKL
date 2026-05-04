<?php
require_once __DIR__ . '/../../config/database.php';

function donasi_json(array $payload, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

if (!isset($_SESSION['user']) || ($_SESSION['user']['kategori'] ?? '') !== 'tamu') {
    donasi_json(['success' => false, 'error' => 'Upload bukti donasi hanya untuk akun tamu.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    donasi_json(['success' => false, 'error' => 'Metode tidak valid'], 405);
}

$csrfToken = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
    donasi_json(['success' => false, 'error' => 'Sesi keamanan kadaluarsa. Refresh halaman lalu coba lagi.'], 403);
}

$nama = trim($_POST['nama'] ?? '');
$nominal = max(0, (int) ($_POST['nominal'] ?? 0));
$catatan = trim($_POST['catatan'] ?? '');
$userId = (int) $_SESSION['user']['id'];

$errors = collect_errors([
    validate_required($nama, 'Nama donatur'),
    validate_length($nama, 'Nama donatur', 1, 100),
    $nominal <= 0 ? 'Nominal donasi wajib diisi' : null,
    validate_length($catatan, 'Catatan', 0, 500),
    empty($_FILES['file']['name']) ? 'Bukti transfer wajib diupload' : null,
]);
if ($errors) donasi_json(['success' => false, 'error' => implode('. ', $errors)], 400);

$uploadDir = __DIR__ . '/../../uploads/donasi/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
if (!is_writable($uploadDir)) donasi_json(['success' => false, 'error' => 'Folder upload donasi tidak bisa ditulis'], 500);

if (!isset($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    donasi_json(['success' => false, 'error' => 'Upload bukti transfer gagal. Coba ulangi.'], 400);
}

$allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
$allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
$maxFileSize = 5 * 1024 * 1024;
$fileErrors = collect_errors([
    validate_file_extension($_FILES['file']['name'], 'Bukti transfer', $allowedExt),
    validate_file_size($_FILES['file']['size'], 'Bukti transfer', $maxFileSize),
]);
if ($fileErrors) donasi_json(['success' => false, 'error' => implode('. ', $fileErrors)], 400);

$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
$safeName = uniqid('donasi_', true) . '.' . $ext;
$filePath = 'uploads/donasi/' . $safeName;
$targetPath = $uploadDir . $safeName;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    donasi_json(['success' => false, 'error' => 'Gagal menyimpan bukti transfer'], 500);
}

$mimeError = validate_mime_type($targetPath, 'Bukti transfer', $allowedMime);
if ($mimeError) {
    unlink($targetPath);
    donasi_json(['success' => false, 'error' => $mimeError], 400);
}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS donasi_bukti (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        nama VARCHAR(100) NOT NULL,
        nominal INT NOT NULL DEFAULT 0,
        catatan TEXT NULL,
        file_path VARCHAR(255) NOT NULL,
        status ENUM('menunggu','diterima','ditolak') DEFAULT 'menunggu',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )");
    $stmt = $pdo->prepare('INSERT INTO donasi_bukti (user_id, nama, nominal, catatan, file_path) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $nama, $nominal, $catatan, $filePath]);
} catch (Exception $e) {
    if (file_exists($targetPath)) unlink($targetPath);
    donasi_json(['success' => false, 'error' => 'Gagal menyimpan data donasi'], 500);
}

donasi_json(['success' => true, 'message' => 'Bukti transfer berhasil dikirim. Terima kasih atas dukungannya.']);
?>
