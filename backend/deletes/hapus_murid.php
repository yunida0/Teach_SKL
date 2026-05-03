<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    http_response_code(403);
    die(json_encode(['success' => false, 'error' => 'Akses ditolak']));
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'ID murid tidak valid']));
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND kategori = 'murid' LIMIT 1");
$stmt->execute([$id]);
if (!$stmt->fetch()) {
    http_response_code(404);
    die(json_encode(['success' => false, 'error' => 'Murid tidak ditemukan']));
}

// ON DELETE CASCADE on murid, nilai_quiz, absensi_murid via FK
$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$id]);

echo json_encode(['success' => true]);
?>
