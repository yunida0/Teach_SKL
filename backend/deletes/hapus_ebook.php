<?php
require_once __DIR__ . '/../../config/database.php';

function wants_json_response(): bool {
    // Hapus ebook bisa datang dari UI React atau link PHP lama.
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return stripos($accept, 'application/json') !== false || strtolower($requestedWith) === 'fetch';
}

function ebook_delete_error(string $message, int $code = 400): void {
    if (wants_json_response()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&error=' . urlencode($message));
    exit;
}

function ebook_delete_success(string $message): void {
    if (wants_json_response()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'message' => $message]);
        exit;
    }
    header('Location: ../dashboard.php?page=ebook&success=' . urlencode($message));
    exit;
}

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    ebook_delete_error('Akses ditolak', 403);
}

$id = isset($_POST['id']) ? (int) $_POST['id'] : (isset($_GET['id']) ? (int) $_GET['id'] : 0);
if ($id <= 0) {
    ebook_delete_error('ID materi tidak valid');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') csrf_verify();

$stmt = $pdo->prepare('SELECT file_path FROM ebook WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$file = $stmt->fetch();

if ($file && !empty($file['file_path'])) {
    $targetPath = __DIR__ . '/../..//' . ltrim($file['file_path'], '/');
    if (file_exists($targetPath)) unlink($targetPath);
}

$stmt = $pdo->prepare('DELETE FROM ebook WHERE id = ?');
$stmt->execute([$id]);

ebook_delete_success('Materi dihapus');
?>
