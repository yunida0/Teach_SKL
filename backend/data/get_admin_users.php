<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$kategori = $_GET['kategori'] ?? '';
$allowed = ['pengajar', 'murid', 'tamu', 'admin'];

if ($kategori !== '' && in_array($kategori, $allowed, true)) {
    $stmt = $pdo->prepare('SELECT u.id, u.nama, u.username, u.kategori, u.foto, u.created_at, p.universitas, p.bidang, p.telepon, COALESCE(p.alamat, m.alamat) AS alamat, m.tingkat, m.umur FROM users u LEFT JOIN pengajar p ON p.user_id = u.id LEFT JOIN murid m ON m.user_id = u.id WHERE u.kategori = ? ORDER BY u.created_at DESC');
    $stmt->execute([$kategori]);
} else {
    $stmt = $pdo->query('SELECT u.id, u.nama, u.username, u.kategori, u.foto, u.created_at, p.universitas, p.bidang, p.telepon, COALESCE(p.alamat, m.alamat) AS alamat, m.tingkat, m.umur FROM users u LEFT JOIN pengajar p ON p.user_id = u.id LEFT JOIN murid m ON m.user_id = u.id ORDER BY u.created_at DESC');
}

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
