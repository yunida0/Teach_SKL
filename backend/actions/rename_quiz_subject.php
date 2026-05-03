<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

$oldPelajaran = trim($_POST['old_pelajaran'] ?? '');
$newPelajaran = trim($_POST['new_pelajaran'] ?? '');

if ($oldPelajaran === '' || $newPelajaran === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nama judul quiz lama dan baru harus diisi']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE quiz SET pelajaran = ? WHERE pelajaran = ?');
    $stmt->execute([$newPelajaran, $oldPelajaran]);
    
    echo json_encode(['success' => true, 'message' => 'Judul/Tipe Quiz berhasil diperbarui', 'updatedRows' => $stmt->rowCount()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Terjadi kesalahan pada server']);
}
?>
