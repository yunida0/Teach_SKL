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

$pelajaran = trim($_POST['pelajaran'] ?? '');
$judul     = trim($_POST['judul_tugas'] ?? '');
$deskripsi = trim($_POST['deskripsi'] ?? '');
$deadline  = trim($_POST['deadline'] ?? '');

if ($pelajaran === '' || $judul === '' || $deskripsi === '' || $deadline === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tugas belum lengkap']);
    exit;
}

$filePath = null;
if (!empty($_FILES['file']['name'])) {
    $uploadDir = __DIR__ . '/../../uploads/tugas/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $ext     = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    $allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip'];
    $allowedMime = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'application/zip',
        'application/x-zip-compressed',
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

    $safeName  = uniqid('tugas_', true) . '.' . $ext;
    $filePath  = 'uploads/tugas/' . $safeName;
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

$pdo->prepare('INSERT INTO bank_tugas (pelajaran, judul_tugas, deskripsi, file_path, deadline) VALUES (?, ?, ?, ?, ?)')
    ->execute([$pelajaran, $judul, $deskripsi, $filePath, $deadline]);

echo json_encode(['success' => true]);
?>
