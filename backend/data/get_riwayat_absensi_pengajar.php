<?php
require_once __DIR__ . '/../../config/database.php';
$stmt = $pdo->query("SELECT a.tanggal, a.status, a.keterangan, u.nama 
                     FROM absensi_pengajar a 
                     JOIN users u ON a.pengajar_id = u.id 
                     ORDER BY a.tanggal DESC LIMIT 50");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
