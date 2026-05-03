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

$tanggal = $_POST['tanggal'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format tanggal tidak valid']);
    exit;
}

$allowedStatus = ['hadir', 'izin', 'sakit', 'alpha'];
$saved = 0;

foreach ($_POST as $key => $value) {
    if (strpos($key, 'status_') !== 0) continue;
    $murid_id = (int) substr($key, 7);
    if ($murid_id <= 0 || !in_array($value, $allowedStatus, true)) continue;

    $chk = $pdo->prepare('SELECT id FROM absensi_murid WHERE murid_id = ? AND tanggal = ?');
    $chk->execute([$murid_id, $tanggal]);

    if ($chk->rowCount() > 0) {
        $pdo->prepare('UPDATE absensi_murid SET status = ? WHERE murid_id = ? AND tanggal = ?')
            ->execute([$value, $murid_id, $tanggal]);
    } else {
        $pdo->prepare('INSERT INTO absensi_murid (murid_id, tanggal, status) VALUES (?, ?, ?)')
            ->execute([$murid_id, $tanggal, $value]);
    }
    $saved++;
}

echo json_encode(['success' => true, 'saved' => $saved]);
?>
