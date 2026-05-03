<?php
require_once __DIR__ . '/../../config/database.php';
$tipe = $_GET['tipe'] ?? 'murid';

if ($tipe == 'murid') {
    $murids = $pdo->query("SELECT u.id, u.nama FROM users u JOIN murid m ON u.id = m.user_id")->fetchAll();
    $absensiHariIni = $pdo->query("SELECT murid_id, status FROM absensi_murid WHERE tanggal = CURDATE()")->fetchAll(PDO::FETCH_KEY_PAIR);
    echo json_encode(['murids' => $murids, 'absensiHariIni' => $absensiHariIni]);
} else {
    $pengajars = $pdo->query("SELECT u.id, u.nama FROM users u JOIN pengajar p ON u.id = p.user_id")->fetchAll();
    $absensiHariIni = $pdo->query("SELECT pengajar_id, status FROM absensi_pengajar WHERE tanggal = CURDATE()")->fetchAll(PDO::FETCH_KEY_PAIR);
    echo json_encode(['pengajars' => $pengajars, 'absensiHariIni' => $absensiHariIni]);
}
?>
