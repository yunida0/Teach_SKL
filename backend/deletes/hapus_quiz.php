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
$pelajaran = trim($_POST['pelajaran'] ?? '');

if ($pelajaran !== '') {
    $stmt = $pdo->prepare('SELECT id FROM quiz WHERE pelajaran = ?');
    $stmt->execute([$pelajaran]);
    $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

    if (!$ids) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Quiz tidak ditemukan']);
        exit;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("DELETE FROM nilai_quiz WHERE quiz_id IN ($placeholders)");
    $stmt->execute($ids);

    $stmt = $pdo->prepare("DELETE FROM quiz WHERE id IN ($placeholders)");
    $stmt->execute($ids);

    echo json_encode(['success' => true, 'message' => 'Quiz berhasil dihapus']);
    exit;
}

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID quiz tidak valid']);
    exit;
}

$stmt = $pdo->prepare('DELETE FROM nilai_quiz WHERE quiz_id = ?');
$stmt->execute([$id]);

$stmt = $pdo->prepare('DELETE FROM quiz WHERE id = ?');
$stmt->execute([$id]);

echo json_encode(['success' => true, 'message' => 'Quiz berhasil dihapus']);
?>
