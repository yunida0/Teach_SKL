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

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID quiz tidak valid']);
    exit;
}

$stmt = $pdo->prepare('DELETE FROM nilai_quiz WHERE quiz_id = ?');
$stmt->execute([$id]);

$stmt = $pdo->prepare('DELETE FROM quiz WHERE id = ?');
$stmt->execute([$id]);

echo json_encode(['success' => true, 'message' => 'Quiz berhasil dihapus']);
?>
