<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'pengajar') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

$pelajaran = trim($_POST['pelajaran'] ?? '');
$soal      = trim($_POST['soal'] ?? '');
$tipe      = $_POST['tipe'] ?? '';
$opsiA     = trim($_POST['opsi_a'] ?? '');
$opsiB     = trim($_POST['opsi_b'] ?? '');
$opsiC     = trim($_POST['opsi_c'] ?? '');
$opsiD     = trim($_POST['opsi_d'] ?? '');
$jawaban   = strtoupper(trim($_POST['jawaban_benar'] ?? ''));

if ($pelajaran === '' || $soal === '' || !in_array($tipe, ['benar_salah', 'pilihan_ganda'], true)
    || $opsiA === '' || $opsiB === '' || !in_array($jawaban, ['A', 'B', 'C', 'D'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data quiz belum lengkap']);
    exit;
}

if ($tipe === 'benar_salah') {
    $opsiC = '';
    $opsiD = '';
    if (!in_array($jawaban, ['A', 'B'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Jawaban benar/salah harus A atau B']);
        exit;
    }
}

$pdo->prepare('INSERT INTO quiz (pelajaran, soal, tipe, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$pelajaran, $soal, $tipe, $opsiA, $opsiB, $opsiC, $opsiD, $jawaban]);

echo json_encode(['success' => true, 'message' => 'Quiz berhasil ditambahkan']);
?>
