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

$pelajaran = trim($_POST['pelajaran'] ?? '');
$soal      = trim($_POST['soal'] ?? '');
$tipe      = $_POST['tipe'] ?? '';
$opsiA     = trim($_POST['opsi_a'] ?? '');
$opsiB     = trim($_POST['opsi_b'] ?? '');
$opsiC     = trim($_POST['opsi_c'] ?? '');
$opsiD     = trim($_POST['opsi_d'] ?? '');
$jawaban   = strtoupper(trim($_POST['jawaban_benar'] ?? ''));

if (mb_strlen($pelajaran) > 255) {
    $pelajaran = mb_substr($pelajaran, 0, 255);
}

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

$pdo->exec('ALTER TABLE quiz MODIFY pelajaran VARCHAR(255)');

$pdo->prepare('INSERT INTO quiz (pelajaran, soal, tipe, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$pelajaran, $soal, $tipe, $opsiA, $opsiB, $opsiC, $opsiD, $jawaban]);

echo json_encode(['success' => true, 'message' => 'Quiz berhasil ditambahkan']);
?>
