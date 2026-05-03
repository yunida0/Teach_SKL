<?php
$pdo = new PDO('mysql:host=localhost;dbname=tech_skl;charset=utf8', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$hash = password_hash('admin123', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (nama, username, password, kategori, foto) VALUES (?, ?, ?, 'admin', '')
    ON DUPLICATE KEY UPDATE nama = VALUES(nama), password = VALUES(password), kategori = 'admin'");
$stmt->execute(['Administrator', 'admin', $hash]);

echo "Admin password reset to admin123\n";
?>
