<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$ebook = $pdo->query("SELECT id, judul_materi, pelajaran, tanggal_upload FROM ebook ORDER BY tanggal_upload DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
$quiz  = $pdo->query("SELECT id, pelajaran, tipe, LEFT(soal, 80) AS soal FROM quiz ORDER BY id DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
$tugas = $pdo->query("SELECT id, judul_tugas, pelajaran, deadline FROM bank_tugas ORDER BY id DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
$dok   = $pdo->query("SELECT id, judul, tipe, tanggal_upload FROM dokumentasi ORDER BY tanggal_upload DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'ebook'       => $ebook,
    'quiz'        => $quiz,
    'tugas'       => $tugas,
    'dokumentasi' => $dok,
    'counts'      => [
        'ebook'       => (int) $pdo->query("SELECT COUNT(*) FROM ebook")->fetchColumn(),
        'quiz'        => (int) $pdo->query("SELECT COUNT(*) FROM quiz")->fetchColumn(),
        'tugas'       => (int) $pdo->query("SELECT COUNT(*) FROM bank_tugas")->fetchColumn(),
        'dokumentasi' => (int) $pdo->query("SELECT COUNT(*) FROM dokumentasi")->fetchColumn(),
    ],
]);
?>
