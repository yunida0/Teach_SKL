<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

require_login_json();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

$user = $_SESSION['user'];
$userId = (int) $user['id'];

try {
    $pdo->beginTransaction();

    if (!empty($user['foto']) && file_exists('../' . $user['foto'])) {
        unlink('../' . $user['foto']);
    }

    if ($user['kategori'] === 'pengajar') {
        $stmt = $pdo->prepare('DELETE FROM pengajar WHERE user_id = ?');
        $stmt->execute([$userId]);
    } elseif ($user['kategori'] === 'murid') {
        $stmt = $pdo->prepare('DELETE FROM murid WHERE user_id = ?');
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare('DELETE FROM absensi_murid WHERE murid_id = ?');
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare('DELETE FROM nilai_quiz WHERE murid_id = ?');
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare('DELETE FROM raport WHERE murid_id = ?');
        $stmt->execute([$userId]);
    }

    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);

    $pdo->commit();

    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Akun berhasil dihapus']);
    exit;
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gagal menghapus akun']);
    exit;
}
?>
