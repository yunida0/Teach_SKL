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
$tanggal     = date('Y-m-d');

if (!in_array($status, ['hadir', 'izin', 'sakit', 'alpha'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Status tidak valid']);
    exit;
}

$chk = $pdo->prepare('SELECT id FROM absensi_pengajar WHERE pengajar_id = ? AND tanggal = ?');
$chk->execute([$pengajar_id, $tanggal]);

if ($chk->rowCount() > 0) {
    $pdo->prepare('UPDATE absensi_pengajar SET status = ?, keterangan = ? WHERE pengajar_id = ? AND tanggal = ?')
        ->execute([$status, $keterangan, $pengajar_id, $tanggal]);
} else {
    $pdo->prepare('INSERT INTO absensi_pengajar (pengajar_id, tanggal, status, keterangan) VALUES (?, ?, ?, ?)')
        ->execute([$pengajar_id, $tanggal, $status, $keterangan]);
}

echo json_encode(['success' => true, 'message' => 'Absensi hari ini tersimpan']);
?>
