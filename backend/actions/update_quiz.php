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

$id        = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$pelajaran = trim($_POST['pelajaran'] ?? '');
$soal      = trim($_POST['soal'] ?? '');
$tipe      = $_POST['tipe'] ?? '';
$opsiA     = trim($_POST['opsi_a'] ?? '');
$opsiB     = trim($_POST['opsi_b'] ?? '');
$opsiC     = trim($_POST['opsi_c'] ?? '');
$opsiD     = trim($_POST['opsi_d'] ?? '');
$jawaban   = strtoupper(trim($_POST['jawaban_benar'] ?? ''));
$tingkat   = trim($_POST['tingkat'] ?? 'SD');

if (!in_array($tingkat, ['TK', 'SD', 'SMP'], true)) {
    $tingkat = 'SD';
}

if (mb_strlen($pelajaran) > 255) {
    $pelajaran = mb_substr($pelajaran, 0, 255);
}

if ($id <= 0 || $pelajaran === '' || $soal === '' || !in_array($tipe, ['benar_salah', 'pilihan_ganda'], true)
    || $opsiA === '' || $opsiB === '' || !in_array($jawaban, ['A', 'B', 'C', 'D'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data quiz belum lengkap']);
    exit;
}

if ($tipe === 'pilihan_ganda' && ($opsiC === '' || $opsiD === '')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Opsi C dan D wajib diisi untuk pilihan ganda']);
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

try {
    $cols = $pdo->query('SHOW COLUMNS FROM quiz')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('tingkat', $cols, true)) {
        $pdo->exec("ALTER TABLE quiz ADD COLUMN tingkat VARCHAR(80) DEFAULT 'SD'");
    }
} catch (Throwable $e) {
    log_error('Quiz tingkat column check failed', ['error' => $e->getMessage()]);
}

$stmt = $pdo->prepare('UPDATE quiz SET pelajaran = ?, soal = ?, tipe = ?, opsi_a = ?, opsi_b = ?, opsi_c = ?, opsi_d = ?, jawaban_benar = ?, tingkat = ? WHERE id = ?');
$stmt->execute([$pelajaran, $soal, $tipe, $opsiA, $opsiB, $opsiC, $opsiD, $jawaban, $tingkat, $id]);

if ($stmt->rowCount() < 1) {
    $check = $pdo->prepare('SELECT id FROM quiz WHERE id = ? LIMIT 1');
    $check->execute([$id]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Soal tidak ditemukan']);
        exit;
    }
}

echo json_encode(['success' => true, 'message' => 'Quiz berhasil diupdate']);
?>
