<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['murid']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

$muridId = (int) $_SESSION['user']['id'];
$tugasId = isset($_POST['tugas_id']) ? (int) $_POST['tugas_id'] : 0;
$catatan = trim($_POST['catatan'] ?? '');

if ($tugasId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tugas tidak valid']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM bank_tugas WHERE id = ? LIMIT 1');
$stmt->execute([$tugasId]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Tugas tidak ditemukan']);
    exit;
}

if (empty($_FILES['file']['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File jawaban wajib diupload']);
    exit;
}

if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Upload file gagal']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/pengumpulan_tugas/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
if (!is_writable($uploadDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Folder upload tidak bisa ditulis']);
    exit;
}

$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
$allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'jpg', 'jpeg', 'png', 'webp'];
$allowedMime = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png',
    'image/webp',
];

if (!in_array($ext, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format file tidak didukung']);
    exit;
}

$sizeError = validate_file_size($_FILES['file']['size'] ?? 0, 'File jawaban', 25 * 1024 * 1024);
if ($sizeError) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $sizeError]);
    exit;
}

$safeName = uniqid('jawaban_' . $muridId . '_' . $tugasId . '_', true) . '.' . $ext;
$filePath = 'uploads/pengumpulan_tugas/' . $safeName;
$targetPath = __DIR__ . '/../../' . $filePath;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal mengunggah file jawaban']);
    exit;
}

$mimeError = validate_mime_type($targetPath, 'File jawaban', $allowedMime);
if ($mimeError) {
    unlink($targetPath);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $mimeError]);
    exit;
}

$pdo->exec("CREATE TABLE IF NOT EXISTS pengumpulan_tugas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tugas_id INT NOT NULL,
    murid_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    catatan TEXT NULL,
    nilai INT NULL,
    feedback TEXT NULL,
    tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tanggal_nilai TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uniq_tugas_murid (tugas_id, murid_id)
)");

$oldStmt = $pdo->prepare('SELECT file_path FROM pengumpulan_tugas WHERE tugas_id = ? AND murid_id = ? LIMIT 1');
$oldStmt->execute([$tugasId, $muridId]);
$oldPath = $oldStmt->fetchColumn();

$stmt = $pdo->prepare('INSERT INTO pengumpulan_tugas (tugas_id, murid_id, file_path, catatan, nilai, feedback, tanggal_upload, tanggal_nilai)
    VALUES (?, ?, ?, ?, NULL, NULL, NOW(), NULL)
    ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), catatan = VALUES(catatan), nilai = NULL, feedback = NULL, tanggal_upload = NOW(), tanggal_nilai = NULL');
$stmt->execute([$tugasId, $muridId, $filePath, $catatan]);

if ($oldPath && $oldPath !== $filePath) {
    $oldReal = realpath(__DIR__ . '/../../' . $oldPath);
    $root = realpath($uploadDir);
    if ($oldReal && $root && str_starts_with($oldReal, $root) && file_exists($oldReal)) unlink($oldReal);
}

echo json_encode(['success' => true, 'path' => $filePath]);
?>
