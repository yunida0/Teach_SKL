<?php
require_once __DIR__ . '/../../config/database.php';
$stmt = $pdo->query("SELECT * FROM bank_tugas ORDER BY deadline DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
