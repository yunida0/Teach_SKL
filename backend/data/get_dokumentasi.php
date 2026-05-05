<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['pengajar', 'murid', 'tamu', 'admin']);

$stmt = $pdo->query("SELECT * FROM dokumentasi ORDER BY tahun DESC, tanggal_upload DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
