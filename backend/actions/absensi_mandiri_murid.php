<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['murid']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

// Koordinat sekolah (default sementara — ganti dengan koordinat asli)
define('SCHOOL_LAT', -7.7956);
define('SCHOOL_LNG', 110.3695);
define('MAX_RADIUS_METERS', 200);

$muridId = (int) $_SESSION['user']['id'];
$lat = isset($_POST['lat']) ? (float) $_POST['lat'] : null;
$lng = isset($_POST['lng']) ? (float) $_POST['lng'] : null;
$status = trim($_POST['status'] ?? 'hadir');
$tanggal = date('Y-m-d');

if (!in_array($status, ['hadir', 'izin', 'sakit'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Status tidak valid']);
    exit;
}

// Untuk status hadir, wajib ada koordinat dan dalam radius
if ($status === 'hadir') {
    if ($lat === null || $lng === null || $lat == 0 || $lng == 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Izinkan akses lokasi untuk absen hadir']);
        exit;
    }

    // Haversine formula
    $earthRadius = 6371000; // meter
    $dLat = deg2rad($lat - SCHOOL_LAT);
    $dLng = deg2rad($lng - SCHOOL_LNG);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad(SCHOOL_LAT)) * cos(deg2rad($lat)) *
         sin($dLng / 2) * sin($dLng / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    $distance = $earthRadius * $c;

    if ($distance > MAX_RADIUS_METERS) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Kamu terlalu jauh dari sekolah (' . round($distance) . 'm). Maksimal ' . MAX_RADIUS_METERS . 'm.',
            'distance' => round($distance),
        ]);
        exit;
    }
}

// Cek apakah sudah absen hari ini
$chk = $pdo->prepare('SELECT id FROM absensi_murid WHERE murid_id = ? AND tanggal = ?');
$chk->execute([$muridId, $tanggal]);

if ($chk->fetch()) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'Kamu sudah absen hari ini']);
    exit;
}

// Tambah kolom lat/lng jika belum ada
try {
    $cols = $pdo->query('SHOW COLUMNS FROM absensi_murid')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('latitude', $cols)) {
        $pdo->exec('ALTER TABLE absensi_murid ADD COLUMN latitude DECIMAL(10,7) NULL');
    }
    if (!in_array('longitude', $cols)) {
        $pdo->exec('ALTER TABLE absensi_murid ADD COLUMN longitude DECIMAL(10,7) NULL');
    }
} catch (Exception $e) {
    // ignore if ALTER fails (no privilege)
}

$stmt = $pdo->prepare('INSERT INTO absensi_murid (murid_id, tanggal, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$muridId, $tanggal, $status, $lat, $lng]);

echo json_encode(['success' => true, 'message' => 'Absensi berhasil dicatat', 'status' => $status, 'tanggal' => $tanggal]);
?>
