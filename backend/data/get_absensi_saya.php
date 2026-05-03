<?php
require_once __DIR__ . '/../../config/database.php';
if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] != 'murid') {
    die(json_encode(['error' => 'Unauthorized']));
}

$murid_id = $_SESSION['user']['id'];
$riwayat = $pdo->prepare("SELECT tanggal, status FROM absensi_murid WHERE murid_id = ? ORDER BY tanggal DESC");
$riwayat->execute([$murid_id]);
$riwayatData = $riwayat->fetchAll();

// Hitung statistik
$stats = $pdo->prepare("SELECT status, COUNT(*) as jumlah FROM absensi_murid WHERE murid_id = ? GROUP BY status");
$stats->execute([$murid_id]);
$statData = [];
foreach ($stats->fetchAll() as $row) {
    $statData[$row['status']] = $row['jumlah'];
}

$total = array_sum($statData);
$hadir = $statData['hadir'] ?? 0;
$persen = $total > 0 ? round(($hadir / $total) * 100) : 0;

echo json_encode([
    'riwayat' => $riwayatData,
    'stats' => [
        'hadir' => $statData['hadir'] ?? 0,
        'izin' => $statData['izin'] ?? 0,
        'sakit' => $statData['sakit'] ?? 0,
        'alpha' => $statData['alpha'] ?? 0,
        'persentase' => $persen
    ]
]);
?>
