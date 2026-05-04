<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['pengajar', 'murid', 'admin']);

$stmt = $pdo->query("SELECT * FROM ebook ORDER BY tanggal_upload DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
