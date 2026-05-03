<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Belum login']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

$token = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($token === '' || $sessionToken === '' || !hash_equals($sessionToken, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'CSRF token tidak valid', 'csrfToken' => csrf_token()]);
    exit;
}

$user = $_SESSION['user'];
$userId = (int) $user['id'];
$kategori = $user['kategori'];

$nama = trim($_POST['nama'] ?? '');
if ($nama === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nama tidak boleh kosong']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('UPDATE users SET nama = ? WHERE id = ?');
    $stmt->execute([$nama, $userId]);

    if ($kategori === 'pengajar') {
        $universitas = trim($_POST['universitas'] ?? '');
        $bidang = trim($_POST['bidang'] ?? '');
        $telepon = trim($_POST['telepon'] ?? '');
        $alamat = trim($_POST['alamat'] ?? '');

        $stmt = $pdo->prepare('SELECT user_id FROM pengajar WHERE user_id = ?');
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            $stmt = $pdo->prepare('UPDATE pengajar SET universitas=?, bidang=?, telepon=?, alamat=? WHERE user_id=?');
            $stmt->execute([$universitas, $bidang, $telepon, $alamat, $userId]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO pengajar (user_id, universitas, bidang, telepon, alamat) VALUES (?,?,?,?,?)');
            $stmt->execute([$userId, $universitas, $bidang, $telepon, $alamat]);
        }
    } elseif ($kategori === 'murid') {
        $tingkat = $_POST['tingkat'] ?? '';
        $umur = isset($_POST['umur']) && $_POST['umur'] !== '' ? (int) $_POST['umur'] : null;
        $alamat = trim($_POST['alamat'] ?? '');

        if (!in_array($tingkat, ['TK', 'SD', 'SMP', 'SMA'], true)) {
            throw new RuntimeException('Tingkat tidak valid');
        }

        $stmt = $pdo->prepare('SELECT user_id FROM murid WHERE user_id = ?');
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            $stmt = $pdo->prepare('UPDATE murid SET tingkat=?, umur=?, alamat=? WHERE user_id=?');
            $stmt->execute([$tingkat, $umur, $alamat, $userId]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?,?,?,?)');
            $stmt->execute([$userId, $tingkat, $umur, $alamat]);
        }
    }

    $pdo->commit();

    $_SESSION['user']['nama'] = $nama;

    $detail = null;
    if ($kategori === 'pengajar') {
        $stmt = $pdo->prepare('SELECT * FROM pengajar WHERE user_id = ?');
        $stmt->execute([$userId]);
        $detail = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        $_SESSION['detail'] = $detail;
    } elseif ($kategori === 'murid') {
        $stmt = $pdo->prepare('SELECT * FROM murid WHERE user_id = ?');
        $stmt->execute([$userId]);
        $detail = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        $_SESSION['detail'] = $detail;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Profil berhasil disimpan',
        'user' => $_SESSION['user'],
        'detail' => $detail,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $msg = $e instanceof RuntimeException ? $e->getMessage() : 'Gagal menyimpan profil';
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $msg]);
}
?>
