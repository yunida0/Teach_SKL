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

$murid_id     = isset($_POST['murid_id'])     ? (int) $_POST['murid_id']     : 0;
$tahun        = isset($_POST['tahun'])        ? (int) $_POST['tahun']        : 0;
$bulan        = isset($_POST['bulan'])        ? (int) $_POST['bulan']        : 0;
$nilai_minggu1 = isset($_POST['nilai_minggu1']) ? (int) $_POST['nilai_minggu1'] : 0;
$nilai_minggu2 = isset($_POST['nilai_minggu2']) ? (int) $_POST['nilai_minggu2'] : 0;
$nilai_minggu3 = isset($_POST['nilai_minggu3']) ? (int) $_POST['nilai_minggu3'] : 0;
$nilai_minggu4 = isset($_POST['nilai_minggu4']) ? (int) $_POST['nilai_minggu4'] : 0;

if ($murid_id <= 0 || $tahun < 2000 || $tahun > 2100 || $bulan < 1 || $bulan > 12) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

foreach ([$nilai_minggu1, $nilai_minggu2, $nilai_minggu3, $nilai_minggu4] as $n) {
    if ($n < 0 || $n > 100) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Nilai harus antara 0-100']);
        exit;
    }
}

$stmt = $pdo->prepare('SELECT AVG(nilai) AS rata_quiz FROM nilai_quiz nq
    JOIN quiz q ON nq.quiz_id = q.id
    WHERE nq.murid_id = ? AND MONTH(nq.tanggal) = ? AND YEAR(nq.tanggal) = ?');
$stmt->execute([$murid_id, $bulan, $tahun]);
$rata_quiz = round($stmt->fetch()['rata_quiz'] ?? 0);

$rata_mingguan    = round(($nilai_minggu1 + $nilai_minggu2 + $nilai_minggu3 + $nilai_minggu4) / 4);
$nilai_akhir_bulan = round(($rata_mingguan * 0.7) + ($rata_quiz * 0.3));

$pdo->prepare('INSERT INTO raport (murid_id, tahun, bulan, minggu_ke, nilai) VALUES
    (?, ?, ?, 1, ?), (?, ?, ?, 2, ?), (?, ?, ?, 3, ?), (?, ?, ?, 4, ?)')
    ->execute([
        $murid_id, $tahun, $bulan, $nilai_minggu1,
        $murid_id, $tahun, $bulan, $nilai_minggu2,
        $murid_id, $tahun, $bulan, $nilai_minggu3,
        $murid_id, $tahun, $bulan, $nilai_minggu4,
    ]);

$pdo->prepare('INSERT INTO raport_bulanan (murid_id, tahun, bulan, nilai_akhir, nilai_quiz) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nilai_akhir = ?, nilai_quiz = ?')
    ->execute([$murid_id, $tahun, $bulan, $nilai_akhir_bulan, $rata_quiz, $nilai_akhir_bulan, $rata_quiz]);

echo json_encode(['success' => true, 'nilai_akhir' => $nilai_akhir_bulan]);
?>
