<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user'])) {
    header('Location: ../index.php');
    exit;
}

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
    header('Location: ../index.php?success=' . urlencode('Akun berhasil dihapus'));
    exit;
} catch (PDOException $e) {
    $pdo->rollBack();
    header('Location: ../dashboard.php?page=profil&error=' . urlencode('Gagal menghapus akun'));
    exit;
}
?>
