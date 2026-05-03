<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    http_response_code(403);
    die(json_encode(['success' => false, 'error' => 'Akses ditolak']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Metode tidak valid']));
}

csrf_verify();

$nama     = trim($_POST['nama'] ?? '');
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$tingkat  = $_POST['tingkat'] ?? '';
$umur     = isset($_POST['umur']) ? (int) $_POST['umur'] : null;
$alamat   = trim($_POST['alamat'] ?? '');

if ($nama === '' || $username === '' || $password === '') {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Nama, username, dan password wajib diisi']));
}

if (!in_array($tingkat, ['TK', 'SD', 'SMP', 'SMA'], true)) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Tingkat murid tidak valid']));
}

if (strlen($password) < 6) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Password minimal 6 karakter']));
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        die(json_encode(['success' => false, 'error' => 'Username sudah digunakan']));
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO users (nama, username, password, kategori) VALUES (?, ?, ?, ?)');
    $stmt->execute([$nama, $username, password_hash($password, PASSWORD_DEFAULT), 'murid']);
    $userId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $tingkat, $umur ?: null, $alamat]);

    $pdo->commit();
    echo json_encode(['success' => true, 'id' => $userId]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal menambahkan murid']);
}
?>
