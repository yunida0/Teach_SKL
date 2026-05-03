<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user'])) {
    header('Location: ../index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../dashboard.php?page=absensi&error=' . urlencode('Metode tidak valid'));
    exit;
}

$user = $_SESSION['user'];
$kategori = $user['kategori'];
$tanggal = date('Y-m-d');
$status = $_POST['status'] ?? 'hadir';
$allowedStatus = ['hadir', 'izin', 'sakit', 'alpha'];

if (!in_array($status, $allowedStatus, true)) {
    header('Location: ../dashboard.php?page=absensi&error=' . urlencode('Status absensi tidak valid'));
    exit;
}

if ($kategori === 'pengajar') {
    $stmt = $pdo->prepare('SELECT id FROM absensi_pengajar WHERE pengajar_id = ? AND tanggal = ? LIMIT 1');
    $stmt->execute([$user['id'], $tanggal]);

    if ($stmt->rowCount() > 0) {
        $stmt = $pdo->prepare('UPDATE absensi_pengajar SET status = ? WHERE pengajar_id = ? AND tanggal = ?');
        $stmt->execute([$status, $user['id'], $tanggal]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO absensi_pengajar (pengajar_id, tanggal, status) VALUES (?, ?, ?)');
        $stmt->execute([$user['id'], $tanggal, $status]);
    }

    header('Location: ../dashboard.php?page=absensi&success=' . urlencode('Absensi berhasil disimpan'));
    exit;
}

if ($kategori === 'murid') {
    $stmt = $pdo->prepare('SELECT id FROM absensi_murid WHERE murid_id = ? AND tanggal = ? LIMIT 1');
    $stmt->execute([$user['id'], $tanggal]);

    if ($stmt->rowCount() > 0) {
        $stmt = $pdo->prepare('UPDATE absensi_murid SET status = ? WHERE murid_id = ? AND tanggal = ?');
        $stmt->execute([$status, $user['id'], $tanggal]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO absensi_murid (murid_id, tanggal, status) VALUES (?, ?, ?)');
        $stmt->execute([$user['id'], $tanggal, $status]);
    }

    header('Location: ../dashboard.php?page=absensi&success=' . urlencode('Absensi berhasil disimpan'));
    exit;
}

header('Location: ../dashboard.php?page=absensi&error=' . urlencode('Tamu tidak dapat melakukan absensi'));
exit;
?>
