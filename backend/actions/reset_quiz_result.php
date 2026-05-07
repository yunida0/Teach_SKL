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

$pelajaran = trim($_POST['pelajaran'] ?? '');
$muridId = isset($_POST['murid_id']) ? (int) $_POST['murid_id'] : 0;
if ($pelajaran === '' || $muridId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data reset tidak valid']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM quiz WHERE pelajaran = ?');
$stmt->execute([$pelajaran]);
$ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
if (!$ids) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Quiz tidak ditemukan']);
    exit;
}

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$params = array_merge([$muridId], $ids);
$stmt = $pdo->prepare("DELETE FROM nilai_quiz WHERE murid_id = ? AND quiz_id IN ($placeholders)");
$stmt->execute($params);

echo json_encode(['success' => true, 'message' => 'Pengerjaan murid berhasil direset']);
?>
