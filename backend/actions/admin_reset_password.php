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

$userId = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
$password = $_POST['password'] ?? '';

if ($userId <= 0 || strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password minimal 6 karakter']);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
$stmt->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);

echo json_encode(['success' => true, 'message' => 'Password berhasil direset']);
?>
