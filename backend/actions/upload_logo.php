<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

$pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$logoSize = isset($_POST['logo_size']) ? (int) $_POST['logo_size'] : 0;
if ($logoSize > 0) {
    $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('logo_size', ?) ON DUPLICATE KEY UPDATE setting_value = ?")
        ->execute([(string)$logoSize, (string)$logoSize]);
}

if (empty($_FILES['logo']['name'])) {
    if ($logoSize > 0) {
        echo json_encode(['success' => true, 'message' => 'Ukuran logo diperbarui']);
        exit;
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File logo wajib diupload']);
    exit;
}

if ($_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Upload gagal']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/logo/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$ext = strtolower(pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
if (!in_array($ext, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format logo harus JPG, PNG, WebP, atau SVG']);
    exit;
}

$sizeError = validate_file_size($_FILES['logo']['size'] ?? 0, 'Logo', 5 * 1024 * 1024);
if ($sizeError) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $sizeError]);
    exit;
}

$safeName = 'site_logo_' . time() . '.' . $ext;
$filePath = 'uploads/logo/' . $safeName;
$targetPath = $uploadDir . $safeName;

if (!move_uploaded_file($_FILES['logo']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal menyimpan logo']);
    exit;
}

// Delete old logo
$old = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'logo_path'")->fetchColumn();
if ($old) {
    $oldReal = realpath(__DIR__ . '/../../' . $old);
    $root = realpath($uploadDir);
    if ($oldReal && $root && str_starts_with($oldReal, $root) && file_exists($oldReal)) unlink($oldReal);
}

$pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('logo_path', ?) ON DUPLICATE KEY UPDATE setting_value = ?")
    ->execute([$filePath, $filePath]);

if ($logoSize <= 0) $logoSize = 64;
$pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('logo_size', ?) ON DUPLICATE KEY UPDATE setting_value = ?")
    ->execute([(string)$logoSize, (string)$logoSize]);

echo json_encode(['success' => true, 'path' => $filePath, 'size' => $logoSize]);
?>
