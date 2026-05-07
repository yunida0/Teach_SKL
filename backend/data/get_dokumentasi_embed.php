<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

$pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
$json = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'dokumentasi_embed_photos' LIMIT 1")->fetchColumn();
echo $json ?: '[]';
?>
