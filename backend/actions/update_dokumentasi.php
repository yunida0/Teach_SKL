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
$judul = trim($_POST['judul'] ?? '');
$tahun = isset($_POST['tahun']) ? (int) $_POST['tahun'] : 0;
if ($id <= 0 || $judul === '' || $tahun < 2000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data dokumentasi tidak valid']);
    exit;
}

$stmt = $pdo->prepare('UPDATE dokumentasi SET judul = ?, tahun = ? WHERE id = ?');
$stmt->execute([$judul, $tahun, $id]);
echo json_encode(['success' => true]);
?>
