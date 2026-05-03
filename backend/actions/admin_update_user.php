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

$userId = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
$nama = trim($_POST['nama'] ?? '');
$kategori = $_POST['kategori'] ?? '';
$allowed = ['admin', 'pengajar', 'murid', 'tamu'];

if ($userId <= 0 || $nama === '' || !in_array($kategori, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data pengguna tidak valid']);
    exit;
}

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT kategori FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $old = $stmt->fetch();
    if (!$old) {
        throw new RuntimeException('Pengguna tidak ditemukan');
    }

    $stmt = $pdo->prepare('UPDATE users SET nama = ?, kategori = ? WHERE id = ?');
    $stmt->execute([$nama, $kategori, $userId]);

    if ($kategori !== 'pengajar') {
        $pdo->prepare('DELETE FROM pengajar WHERE user_id = ?')->execute([$userId]);
    }
    if ($kategori !== 'murid') {
        $pdo->prepare('DELETE FROM murid WHERE user_id = ?')->execute([$userId]);
    }

    if ($kategori === 'pengajar') {
        $universitas = trim($_POST['universitas'] ?? '');
        $bidang = trim($_POST['bidang'] ?? '');
        $telepon = trim($_POST['telepon'] ?? '');
        $alamat = trim($_POST['alamat'] ?? '');
        $stmt = $pdo->prepare('INSERT INTO pengajar (user_id, universitas, bidang, telepon, alamat) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE universitas = VALUES(universitas), bidang = VALUES(bidang), telepon = VALUES(telepon), alamat = VALUES(alamat)');
        $stmt->execute([$userId, $universitas, $bidang, $telepon, $alamat]);
    }

    if ($kategori === 'murid') {
        $tingkat = $_POST['tingkat'] ?? 'SD';
        if (!in_array($tingkat, ['TK', 'SD', 'SMP', 'SMA'], true)) $tingkat = 'SD';
        $umur = isset($_POST['umur']) && $_POST['umur'] !== '' ? (int) $_POST['umur'] : null;
        $alamat = trim($_POST['alamat'] ?? '');
        $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE tingkat = VALUES(tingkat), umur = VALUES(umur), alamat = VALUES(alamat)');
        $stmt->execute([$userId, $tingkat, $umur, $alamat]);
    }

    $pdo->commit();
    $stmt = $pdo->prepare('SELECT id, nama, username, kategori, foto, created_at FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    echo json_encode(['success' => true, 'user' => $stmt->fetch(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    log_error('Admin update user failed', ['error' => $e->getMessage(), 'user_id' => $userId]);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e instanceof RuntimeException ? $e->getMessage() : 'Gagal update pengguna']);
}
?>
