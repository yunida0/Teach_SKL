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
$tingkat   = trim($_POST['tingkat'] ?? 'SD');
$poin      = isset($_POST['poin']) ? max(1, (int) $_POST['poin']) : 10;

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

// Auto-add tingkat column if missing
try {
    $cols = $pdo->query('SHOW COLUMNS FROM quiz')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('tingkat', $cols)) {
        $pdo->exec("ALTER TABLE quiz ADD COLUMN tingkat VARCHAR(80) DEFAULT 'Umum'");
    }
    if (!in_array('poin', $cols, true)) {
        $pdo->exec("ALTER TABLE quiz ADD COLUMN poin INT NOT NULL DEFAULT 10");
    }
    $pdo->exec("UPDATE quiz SET poin = 10 WHERE poin IS NULL OR poin < 1");
} catch (Exception $e) {}

$pdo->prepare('INSERT INTO quiz (pelajaran, soal, tipe, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, tingkat, poin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$pelajaran, $soal, $tipe, $opsiA, $opsiB, $opsiC, $opsiD, $jawaban, $tingkat, $poin]);

echo json_encode(['success' => true, 'message' => 'Quiz berhasil ditambahkan']);
?>
