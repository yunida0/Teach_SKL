<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'murid', 'tamu', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

$user = $_SESSION['user'];
$user_id = $user['id'];

// Cek apakah ada file yang diupload
if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
    die(json_encode(['success' => false, 'error' => 'No file uploaded']));
}

$target_dir = __DIR__ . "/../../uploads/foto_profil/";
if (!is_dir($target_dir)) mkdir($target_dir, 0755, true);
if (!is_writable($target_dir)) {
    die(json_encode(['success' => false, 'error' => 'Folder upload tidak bisa ditulis']));
}

$extension = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'webp'];

if (!in_array($extension, $allowed)) {
    die(json_encode(['success' => false, 'error' => 'Format tidak didukung']));
}

$sizeError = validate_file_size($_FILES['foto']['size'] ?? 0, 'Foto profil', 3 * 1024 * 1024);
if ($sizeError) {
    die(json_encode(['success' => false, 'error' => $sizeError]));
}

$filename = uniqid('foto_' . $user_id . '_', true) . '.' . $extension;
$target_file = $target_dir . $filename;
$db_path = 'uploads/foto_profil/' . $filename;

if (move_uploaded_file($_FILES['foto']['tmp_name'], $target_file)) {
    $mimeError = validate_mime_type($target_file, 'Foto profil', ['image/jpeg', 'image/png', 'image/webp']);
    if ($mimeError) {
        unlink($target_file);
        die(json_encode(['success' => false, 'error' => $mimeError]));
    }

    // Hapus foto lama jika ada
    $oldPhoto = !empty($user['foto']) ? realpath(__DIR__ . '/../../' . $user['foto']) : false;
    $uploadRoot = realpath($target_dir);
    if ($oldPhoto && $uploadRoot && str_starts_with($oldPhoto, $uploadRoot) && file_exists($oldPhoto)) {
        unlink($oldPhoto);
    }
    
    $stmt = $pdo->prepare("UPDATE users SET foto = ? WHERE id = ?");
    $stmt->execute([$db_path, $user_id]);
    
    $_SESSION['user']['foto'] = $db_path;
    
    echo json_encode(['success' => true, 'path' => $db_path]);
} else {
    echo json_encode(['success' => false, 'error' => 'Gagal upload']);
}
?>
