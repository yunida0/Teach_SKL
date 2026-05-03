<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Belum login']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

$token = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($token === '' || $sessionToken === '' || !hash_equals($sessionToken, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'CSRF token tidak valid', 'csrfToken' => csrf_token()]);
    exit;
}

$userId = (int) $_SESSION['user']['id'];
$passwordLama = $_POST['password_lama'] ?? '';
$passwordBaru = $_POST['password_baru'] ?? '';
$passwordKonfirmasi = $_POST['password_konfirmasi'] ?? '';

if ($passwordLama === '' || $passwordBaru === '' || $passwordKonfirmasi === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Semua kolom wajib diisi']);
    exit;
}

if ($passwordBaru !== $passwordKonfirmasi) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Konfirmasi password baru tidak cocok']);
    exit;
}

if (strlen($passwordBaru) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password baru minimal 6 karakter']);
    exit;
}

$stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row || !password_verify($passwordLama, $row['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Password lama salah']);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
$stmt->execute([password_hash($passwordBaru, PASSWORD_DEFAULT), $userId]);

echo json_encode(['success' => true, 'message' => 'Password berhasil diubah']);
?>
