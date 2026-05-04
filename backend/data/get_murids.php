<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['pengajar', 'admin']);

$stmt = $pdo->query("SELECT u.id, u.nama, u.foto, m.umur, m.tingkat, m.alamat
                     FROM users u 
                     JOIN murid m ON u.id = m.user_id 
                     WHERE u.kategori = 'murid'");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
