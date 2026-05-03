<?php
require_once __DIR__ . '/../../config/database.php';
$stmt = $pdo->query("SELECT u.id, u.nama FROM users u JOIN murid m ON u.id = m.user_id ORDER BY u.nama");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
