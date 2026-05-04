<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['pengajar', 'admin']);

$tipe = $_GET['tipe'] ?? 'murid';

if (!in_array($tipe, ['murid', 'pengajar'], true)) {
    http_response_code(400);
    die(json_encode(['error' => 'Tipe tidak valid']));
}

if ($tipe === 'murid') {
    $stmt = $pdo->query("SELECT a.tanggal, a.status, u.nama as nama_murid 
                         FROM absensi_murid a 
                         JOIN users u ON a.murid_id = u.id 
                         ORDER BY a.tanggal DESC LIMIT 50");
} else {
    $stmt = $pdo->query("SELECT a.tanggal, a.status, a.keterangan, u.nama as nama_pengajar 
                         FROM absensi_pengajar a 
                         JOIN users u ON a.pengajar_id = u.id 
                         ORDER BY a.tanggal DESC LIMIT 50");
}

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
