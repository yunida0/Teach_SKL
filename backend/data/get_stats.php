<?php
require_once __DIR__ . '/../../config/database.php';
if (!isset($_SESSION['user'])) {
    die(json_encode(['error' => 'Unauthorized']));
}

$ebook = $pdo->query("SELECT COUNT(*) FROM ebook")->fetchColumn();
$tugas = $pdo->query("SELECT COUNT(*) FROM bank_tugas")->fetchColumn();
$murid = $pdo->query("SELECT COUNT(*) FROM users WHERE kategori = 'murid'")->fetchColumn();
$quiz = $pdo->query("SELECT COUNT(*) FROM quiz")->fetchColumn();

echo json_encode(['ebook' => $ebook, 'tugas' => $tugas, 'murid' => $murid, 'quiz' => $quiz]);
?>
