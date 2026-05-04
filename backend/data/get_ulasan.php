<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['tamu', 'admin']);

$stmt = $pdo->query("SELECT * FROM ulasan ORDER BY id DESC LIMIT 20");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
