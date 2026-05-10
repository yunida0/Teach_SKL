<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}
csrf_verify();

$id        = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$pelajaran = trim($_POST['pelajaran'] ?? '');
$judul     = trim($_POST['judul_tugas'] ?? '');
$deskripsi = trim($_POST['deskripsi'] ?? '');
$deadline  = trim($_POST['deadline'] ?? '');
$tingkat   = trim($_POST['tingkat'] ?? 'SD');

if ($id <= 0 || $pelajaran === '' || $judul === '' || $deskripsi === '' || $deadline === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tugas belum lengkap']);
    exit;
}
if (!in_array($tingkat, ['TK', 'SD', 'SMP'], true)) $tingkat = 'SD';

$current = $pdo->prepare('SELECT file_path FROM bank_tugas WHERE id = ? LIMIT 1');
$current->execute([$id]);
$row = $current->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Tugas tidak ditemukan']);
    exit;
}

$filePath = $row['file_path'] ?? null;
$oldFile = $filePath;
if (!empty($_FILES['file']['name'])) {
    $uploadDir = __DIR__ . '/../../uploads/tugas/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    $allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
    $allowedMime = [
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 'image/png', 'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar',
    ];
    if (!in_array($ext, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Format file tidak didukung']);
        exit;
    }
    $sizeError = validate_file_size($_FILES['file']['size'] ?? 0, 'File tugas', 20 * 1024 * 1024);
    if ($sizeError) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $sizeError]);
        exit;
    }
    $safeName = uniqid('tugas_', true) . '.' . $ext;
    $filePath = 'uploads/tugas/' . $safeName;
    $targetPath = __DIR__ . '/../../' . $filePath;
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal mengunggah file']);
        exit;
    }
    $mimeError = validate_mime_type($targetPath, 'File tugas', $allowedMime);
    if ($mimeError) {
        unlink($targetPath);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $mimeError]);
        exit;
    }
}

try {
    $cols = $pdo->query('SHOW COLUMNS FROM bank_tugas')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('tingkat', $cols, true)) {
        $pdo->exec("ALTER TABLE bank_tugas ADD COLUMN tingkat VARCHAR(80) DEFAULT 'SD' AFTER pelajaran");
    }
} catch (Throwable $e) {}

$pdo->prepare('UPDATE bank_tugas SET pelajaran = ?, judul_tugas = ?, deskripsi = ?, file_path = ?, deadline = ?, tingkat = ? WHERE id = ?')
    ->execute([$pelajaran, $judul, $deskripsi, $filePath, $deadline, $tingkat, $id]);

if ($oldFile && $oldFile !== $filePath) {
    $oldPath = __DIR__ . '/../../' . $oldFile;
    if (is_file($oldPath)) @unlink($oldPath);
}

echo json_encode(['success' => true]);
?>
