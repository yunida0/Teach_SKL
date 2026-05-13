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

// Pastikan kolom baru ada di raport_bulanan
try {
    $existingCols = array_column(
        $pdo->query('SHOW COLUMNS FROM raport_bulanan')->fetchAll(PDO::FETCH_ASSOC),
        'Field'
    );
    $toAdd = [];
    if (!in_array('nilai_tugas', $existingCols, true))     $toAdd[] = 'ADD COLUMN nilai_tugas INT DEFAULT 0';
    if (!in_array('nilai_kehadiran', $existingCols, true)) $toAdd[] = 'ADD COLUMN nilai_kehadiran INT DEFAULT 0';
    if (!in_array('bonus_poin', $existingCols, true))      $toAdd[] = 'ADD COLUMN bonus_poin INT DEFAULT 0';
    if (!in_array('catatan', $existingCols, true))         $toAdd[] = 'ADD COLUMN catatan TEXT NULL';
    if ($toAdd) $pdo->exec('ALTER TABLE raport_bulanan ' . implode(', ', $toAdd));
} catch (Throwable $e) {}

$murid_id   = isset($_POST['murid_id'])   ? (int) $_POST['murid_id']   : 0;
$tahun      = isset($_POST['tahun'])      ? (int) $_POST['tahun']      : 0;
$bulan      = isset($_POST['bulan'])      ? (int) $_POST['bulan']      : 0;
$bonus_poin = isset($_POST['bonus_poin']) ? (int) $_POST['bonus_poin'] : 0;
$catatan    = trim($_POST['catatan'] ?? '');

if ($murid_id <= 0 || $tahun < 2000 || $tahun > 2100 || $bulan < 1 || $bulan > 12) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

if ($bonus_poin < -30 || $bonus_poin > 30) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Bonus poin harus antara -30 dan +30']);
    exit;
}

// Rata-rata nilai quiz bulan ini
$stmt = $pdo->prepare('SELECT AVG(nq.nilai) AS rata FROM nilai_quiz nq
    WHERE nq.murid_id = ? AND MONTH(nq.tanggal) = ? AND YEAR(nq.tanggal) = ?');
$stmt->execute([$murid_id, $bulan, $tahun]);
$rata_quiz = (int) round($stmt->fetch()['rata'] ?? 0);

// Rata-rata nilai tugas bulan ini (hanya yang sudah dinilai)
$stmt = $pdo->prepare('SELECT AVG(pt.nilai) AS rata FROM pengumpulan_tugas pt
    WHERE pt.murid_id = ? AND pt.nilai IS NOT NULL
    AND MONTH(pt.tanggal_upload) = ? AND YEAR(pt.tanggal_upload) = ?');
$stmt->execute([$murid_id, $bulan, $tahun]);
$rata_tugas = (int) round($stmt->fetch()['rata'] ?? 0);

// Persentase kehadiran bulan ini
$stmt = $pdo->prepare('SELECT COUNT(*) AS total,
    SUM(CASE WHEN status = "hadir" THEN 1 ELSE 0 END) AS hadir
    FROM absensi_murid WHERE murid_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?');
$stmt->execute([$murid_id, $bulan, $tahun]);
$absensi = $stmt->fetch();
$persen_hadir = ($absensi['total'] > 0) ? (int) round(($absensi['hadir'] / $absensi['total']) * 100) : 0;

// Hitung nilai akhir: quiz 40% + tugas 40% + kehadiran 20% + bonus
$nilai_akhir = (int) round(($rata_quiz * 0.4) + ($rata_tugas * 0.4) + ($persen_hadir * 0.2) + $bonus_poin);
$nilai_akhir = max(0, min(100, $nilai_akhir));

$pdo->prepare('INSERT INTO raport_bulanan
    (murid_id, tahun, bulan, nilai_akhir, nilai_quiz, nilai_tugas, nilai_kehadiran, bonus_poin, catatan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        nilai_akhir    = VALUES(nilai_akhir),
        nilai_quiz     = VALUES(nilai_quiz),
        nilai_tugas    = VALUES(nilai_tugas),
        nilai_kehadiran= VALUES(nilai_kehadiran),
        bonus_poin     = VALUES(bonus_poin),
        catatan        = VALUES(catatan)')
    ->execute([$murid_id, $tahun, $bulan, $nilai_akhir, $rata_quiz, $rata_tugas, $persen_hadir, $bonus_poin, $catatan ?: null]);

echo json_encode([
    'success'    => true,
    'nilai_akhir'=> $nilai_akhir,
    'breakdown'  => [
        'quiz'      => $rata_quiz,
        'tugas'     => $rata_tugas,
        'kehadiran' => $persen_hadir,
        'bonus'     => $bonus_poin,
    ],
]);
?>
