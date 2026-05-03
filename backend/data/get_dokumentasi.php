<?php
require_once __DIR__ . '/../../config/database.php';
$stmt = $pdo->query("SELECT * FROM dokumentasi ORDER BY tahun DESC, tanggal_upload DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
