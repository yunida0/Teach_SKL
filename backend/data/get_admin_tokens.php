<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$stmt = $pdo->query('SELECT * FROM teacher_tokens ORDER BY created_at DESC');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
