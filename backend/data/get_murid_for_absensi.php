<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    http_response_code(403);
    die(json_encode(['error' => 'Akses ditolak']));
}

$stmt = $pdo->query(
    "SELECT u.id, u.nama, m.tingkat
     FROM users u
     JOIN murid m ON u.id = m.user_id
     WHERE u.kategori = 'murid'
     ORDER BY u.nama"
);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
