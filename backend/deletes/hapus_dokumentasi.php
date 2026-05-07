<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID tidak valid']);
    exit;
}

$stmt = $pdo->prepare('SELECT file_path FROM dokumentasi WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$file = $stmt->fetch();

if ($file && !empty($file['file_path'])) {
    $full_path = __DIR__ . '/../../' . $file['file_path'];
    if (file_exists($full_path)) {
        unlink($full_path);
    }
}

$pdo->prepare('DELETE FROM dokumentasi WHERE id = ?')->execute([$id]);

echo json_encode(['success' => true, 'message' => 'Dokumentasi berhasil dihapus']);
?>
