<?php
require_once __DIR__ . '/../../config/database.php';
require_role_json(['pengajar', 'murid', 'admin']);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$role = current_role();
$level = trim($_SESSION['detail']['tingkat'] ?? $_SESSION['user']['tingkat'] ?? '');

if ($role === 'murid' && $level !== '') {
    $ebookStmt = $pdo->prepare("SELECT COUNT(*) FROM ebook WHERE tingkat = ? OR tingkat = '' OR tingkat IS NULL OR tingkat = 'Umum'");
    $ebookStmt->execute([$level]);
    $ebook = $ebookStmt->fetchColumn();
} else {
    $ebook = $pdo->query("SELECT COUNT(*) FROM ebook")->fetchColumn();
}

$tugas = $pdo->query("SELECT COUNT(*) FROM bank_tugas")->fetchColumn();
$murid = $role === 'admin' || $role === 'pengajar'
    ? $pdo->query("SELECT COUNT(*) FROM users WHERE kategori = 'murid'")->fetchColumn()
    : 0;
$quiz = $pdo->query("SELECT COUNT(*) FROM quiz")->fetchColumn();

echo json_encode(['ebook' => (int) $ebook, 'tugas' => (int) $tugas, 'murid' => (int) $murid, 'quiz' => (int) $quiz]);
?>
