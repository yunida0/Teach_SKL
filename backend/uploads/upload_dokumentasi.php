<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

$judul = trim($_POST['judul'] ?? '');
$tahun = isset($_POST['tahun']) ? (int) $_POST['tahun'] : 0;
$tipe  = $_POST['tipe'] ?? '';

if ($judul === '' || $tahun < 2000 || !in_array($tipe, ['foto', 'video'], true) || empty($_FILES['file']['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data dokumentasi belum lengkap']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/dokumentasi/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$ext      = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
$allowed  = $tipe === 'foto' ? ['jpg', 'jpeg', 'png', 'webp'] : ['mp4', 'webm', 'mov'];
$allowedMime = $tipe === 'foto' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm', 'video/quicktime'];
$maxFileSize = $tipe === 'foto' ? 8 * 1024 * 1024 : 80 * 1024 * 1024;

if (!in_array($ext, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format file tidak sesuai tipe']);
    exit;
}

$sizeError = validate_file_size($_FILES['file']['size'] ?? 0, 'File dokumentasi', $maxFileSize);
if ($sizeError) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $sizeError]);
    exit;
}

$safeName  = uniqid('dok_', true) . '.' . $ext;
$filePath  = 'uploads/dokumentasi/' . $safeName;
$targetPath = __DIR__ . '/../../' . $filePath;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal mengunggah file']);
    exit;
}

$mimeError = validate_mime_type($targetPath, 'File dokumentasi', $allowedMime);
if ($mimeError) {
    unlink($targetPath);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $mimeError]);
    exit;
}

$pdo->prepare('INSERT INTO dokumentasi (judul, tipe, file_path, tahun) VALUES (?, ?, ?, ?)')
    ->execute([$judul, $tipe, $filePath, $tahun]);

echo json_encode(['success' => true, 'file_path' => $filePath]);
?>
