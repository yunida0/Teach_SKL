<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
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

$tipe   = $_POST['tipe'] ?? '';
$id     = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$tables = ['ebook' => 'ebook', 'quiz' => 'quiz', 'tugas' => 'bank_tugas', 'dokumentasi' => 'dokumentasi'];

if (!isset($tables[$tipe]) || $id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Parameter tidak valid']);
    exit;
}

$pdo->prepare("DELETE FROM {$tables[$tipe]} WHERE id = ?")->execute([$id]);
echo json_encode(['success' => true]);
?>
