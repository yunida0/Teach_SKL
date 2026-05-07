<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'admin']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}
csrf_verify();

$photosRaw = $_POST['photos'] ?? '[]';
$photos = json_decode($photosRaw, true);
if (!is_array($photos)) $photos = [];
$clean = [];
foreach ($photos as $photo) {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($photo['id'] ?? ''));
    $title = trim((string)($photo['title'] ?? 'Dokumentasi'));
    if ($id === '') continue;
    $clean[] = ['id' => $id, 'title' => mb_substr($title ?: 'Dokumentasi', 0, 120)];
}
$pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
$value = json_encode($clean, JSON_UNESCAPED_UNICODE);
$stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('dokumentasi_embed_photos', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
$stmt->execute([$value, $value]);
echo json_encode(['success' => true, 'photos' => $clean]);
?>
