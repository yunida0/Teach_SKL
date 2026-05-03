<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$muridStats = [];
foreach ($pdo->query("SELECT status, COUNT(*) AS n FROM absensi_murid GROUP BY status")->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $muridStats[$r['status']] = (int) $r['n'];
}

$pengajarStats = [];
foreach ($pdo->query("SELECT status, COUNT(*) AS n FROM absensi_pengajar GROUP BY status")->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $pengajarStats[$r['status']] = (int) $r['n'];
}

$recent = $pdo->query("
    SELECT u.nama, 'murid' AS tipe, am.status, am.tanggal
    FROM absensi_murid am JOIN users u ON u.id = am.murid_id
    UNION ALL
    SELECT u.nama, 'pengajar' AS tipe, ap.status, ap.tanggal
    FROM absensi_pengajar ap JOIN users u ON u.id = ap.pengajar_id
    ORDER BY tanggal DESC LIMIT 30
")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'murid'    => $muridStats,
    'pengajar' => $pengajarStats,
    'recent'   => $recent,
]);
?>
