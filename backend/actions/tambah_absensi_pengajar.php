<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
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

$pengajar_id = (int) $_SESSION['user']['id'];
$status      = $_POST['status'] ?? '';
$keterangan  = trim($_POST['keterangan'] ?? '');
$lat         = isset($_POST['lat']) ? (float) $_POST['lat'] : null;
$lng         = isset($_POST['lng']) ? (float) $_POST['lng'] : null;
$tanggal     = date('Y-m-d');

if (!in_array($status, ['hadir', 'izin', 'sakit', 'alpha'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Status tidak valid']);
    exit;
}

if ($status === 'hadir' && ($lat === null || $lng === null || $lat == 0 || $lng == 0)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Izinkan akses lokasi untuk absen hadir']);
    exit;
}

if ($status !== 'hadir') {
    $lat = null;
    $lng = null;
}

try {
    $cols = $pdo->query('SHOW COLUMNS FROM absensi_pengajar')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('latitude', $cols, true)) {
        $pdo->exec('ALTER TABLE absensi_pengajar ADD COLUMN latitude DECIMAL(10,7) NULL');
    }
    if (!in_array('longitude', $cols, true)) {
        $pdo->exec('ALTER TABLE absensi_pengajar ADD COLUMN longitude DECIMAL(10,7) NULL');
    }
} catch (Throwable $e) {
    log_error('Absensi pengajar location column check failed', ['error' => $e->getMessage()]);
}

$chk = $pdo->prepare('SELECT id FROM absensi_pengajar WHERE pengajar_id = ? AND tanggal = ?');
$chk->execute([$pengajar_id, $tanggal]);

if ($chk->rowCount() > 0) {
    $pdo->prepare('UPDATE absensi_pengajar SET status = ?, keterangan = ?, latitude = ?, longitude = ? WHERE pengajar_id = ? AND tanggal = ?')
        ->execute([$status, $keterangan, $lat, $lng, $pengajar_id, $tanggal]);
} else {
    $pdo->prepare('INSERT INTO absensi_pengajar (pengajar_id, tanggal, status, keterangan, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$pengajar_id, $tanggal, $status, $keterangan, $lat, $lng]);
}

echo json_encode(['success' => true, 'message' => 'Absensi hari ini tersimpan']);
?>
