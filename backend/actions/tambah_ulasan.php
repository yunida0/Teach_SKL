<?php
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Metode tidak valid']));
}

csrf_verify();

$nama = trim($_POST['nama'] ?? '');
$rating = isset($_POST['rating']) ? (int) $_POST['rating'] : 0;
$komentar = trim($_POST['komentar'] ?? '');

if ($nama === '' || $komentar === '') {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Nama dan komentar wajib diisi']));
}

if ($rating < 1 || $rating > 5) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Rating harus antara 1-5']));
}

if (strlen($nama) > 100) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Nama terlalu panjang']));
}

if (strlen($komentar) > 1000) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Komentar terlalu panjang']));
}

$stmt = $pdo->prepare("INSERT INTO ulasan (nama, rating, komentar) VALUES (?, ?, ?)");
$stmt->execute([$nama, $rating, $komentar]);

echo json_encode(['success' => true]);
?>
