<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['admin']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}
csrf_verify();

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$status = trim($_POST['status'] ?? '');
if ($id <= 0 || !in_array($status, ['menunggu', 'diterima', 'ditolak'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data status donasi tidak valid']);
    exit;
}

$stmt = $pdo->prepare('UPDATE donasi_bukti SET status = ? WHERE id = ?');
$stmt->execute([$status, $id]);
echo json_encode(['success' => true]);
?>
