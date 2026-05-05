<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

$nama = trim($_POST['nama'] ?? '');
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$kategori = $_POST['kategori'] ?? '';
$allowed = ['admin', 'pengajar', 'murid', 'tamu'];

if ($nama === '' || $username === '' || strlen($password) < 6 || !in_array($kategori, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nama, username, password minimal 6 karakter, dan role wajib valid']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Username sudah digunakan']);
        exit;
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO users (nama, username, password, kategori, foto) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$nama, $username, password_hash($password, PASSWORD_DEFAULT), $kategori, '']);
    $userId = (int) $pdo->lastInsertId();

    if ($kategori === 'pengajar') {
        $universitas = trim($_POST['universitas'] ?? '');
        $bidang = trim($_POST['bidang'] ?? '');
        $telepon = trim($_POST['telepon'] ?? '');
        $alamat = trim($_POST['alamat'] ?? '');
        $stmt = $pdo->prepare('INSERT INTO pengajar (user_id, universitas, bidang, telepon, alamat) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $universitas, $bidang, $telepon, $alamat]);
    }

    if ($kategori === 'murid') {
        $tingkat = $_POST['tingkat'] ?? 'SD';
        if (!in_array($tingkat, ['TK', 'SD', 'SMP'], true)) {
            $tingkat = 'SD';
        }
        $umur = isset($_POST['umur']) && $_POST['umur'] !== '' ? (int) $_POST['umur'] : null;
        $alamat = trim($_POST['alamat'] ?? '');
        $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, $tingkat, $umur, $alamat]);
    }

    $pdo->commit();
    $stmt = $pdo->prepare('SELECT id, nama, username, kategori, foto, created_at FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    echo json_encode(['success' => true, 'user' => $stmt->fetch(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_error('Admin create user failed', ['error' => $e->getMessage(), 'username' => $username]);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gagal membuat pengguna']);
}
?>
