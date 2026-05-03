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

$label = trim($_POST['label'] ?? '');
$token = 'TEACH-' . strtoupper(bin2hex(random_bytes(6)));

try {
    $stmt = $pdo->prepare('INSERT INTO teacher_tokens (token, label) VALUES (?, ?)');
    $stmt->execute([$token, $label]);
    $id = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT * FROM teacher_tokens WHERE id = ?');
    $stmt->execute([$id]);

    echo json_encode(['success' => true, 'token' => $stmt->fetch(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal membuat token']);
}
?>
