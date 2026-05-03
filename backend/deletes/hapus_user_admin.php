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

$csrfToken = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'CSRF token tidak valid']);
    exit;
}

$targetId = (int) ($_POST['user_id'] ?? 0);
$adminId  = (int) $_SESSION['user']['id'];

if ($targetId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID pengguna tidak valid']);
    exit;
}

if ($targetId === $adminId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tidak dapat menghapus akun sendiri']);
    exit;
}

$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$targetId]);

echo json_encode(['success' => true]);
?>
