<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    header('Location: ../index.php');
    exit;
}

$jenis = $_GET['jenis'] ?? 'murid';
if (!in_array($jenis, ['murid', 'pengajar'], true)) {
    header('Location: ../dashboard.php?page=absensi&error=' . urlencode('Jenis absensi tidak valid'));
    exit;
}

try {
    if ($jenis === 'murid') {
        $stmt = $pdo->prepare('DELETE FROM absensi_murid');
        $stmt->execute();
        $message = 'Semua absensi murid berhasil direset';
    } else {
        $stmt = $pdo->prepare('DELETE FROM absensi_pengajar');
        $stmt->execute();
        $message = 'Semua absensi pengajar berhasil direset';
    }

    header('Location: ../dashboard.php?page=absensi&success=' . urlencode($message));
    exit;
} catch (PDOException $e) {
    header('Location: ../dashboard.php?page=absensi&error=' . urlencode('Gagal reset absensi'));
    exit;
}
?>
