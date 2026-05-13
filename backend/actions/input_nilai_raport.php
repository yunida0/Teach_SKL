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
    if (!in_array('pelajaran', $existingCols, true))        $toAdd[] = "ADD COLUMN pelajaran VARCHAR(255) DEFAULT 'Umum' AFTER bulan";
    if (!in_array('nilai_tugas', $existingCols, true))     $toAdd[] = 'ADD COLUMN nilai_tugas INT DEFAULT 0';
    if (!in_array('nilai_kehadiran', $existingCols, true)) $toAdd[] = 'ADD COLUMN nilai_kehadiran INT DEFAULT 0';
    if (!in_array('bonus_poin', $existingCols, true))      $toAdd[] = 'ADD COLUMN bonus_poin INT DEFAULT 0';
    if (!in_array('catatan', $existingCols, true))         $toAdd[] = 'ADD COLUMN catatan TEXT NULL';
    if ($toAdd) $pdo->exec('ALTER TABLE raport_bulanan ' . implode(', ', $toAdd));

    $indexes = $pdo->query('SHOW INDEX FROM raport_bulanan')->fetchAll(PDO::FETCH_ASSOC);
    $uniqueIndexes = [];
    $hasMuridIndex = false;
    foreach ($indexes as $idx) {
        if ($idx['Key_name'] === 'idx_raport_murid') $hasMuridIndex = true;
        if ((int) $idx['Non_unique'] === 0 && $idx['Key_name'] !== 'PRIMARY') {
            $uniqueIndexes[$idx['Key_name']][(int) $idx['Seq_in_index']] = $idx['Column_name'];
        }
    }

    if (!$hasMuridIndex) {
        $pdo->exec('ALTER TABLE raport_bulanan ADD INDEX idx_raport_murid (murid_id)');
    }

    $hasSubjectUnique = false;
    foreach ($uniqueIndexes as $name => $colsBySeq) {
        ksort($colsBySeq);
        $cols = array_values($colsBySeq);
        if ($cols === ['murid_id', 'tahun', 'bulan', 'pelajaran']) {
            $hasSubjectUnique = true;
            continue;
        }
        if ($cols === ['murid_id', 'tahun', 'bulan']) {
            $safeName = str_replace('`', '', $name);
            $pdo->exec("ALTER TABLE raport_bulanan DROP INDEX `$safeName`");
        }
    }

    if (!$hasSubjectUnique) {
        try {
            $pdo->exec('ALTER TABLE raport_bulanan ADD UNIQUE KEY uniq_raport_subject (murid_id, tahun, bulan, pelajaran)');
        } catch (Throwable $e) {
            $indexes = $pdo->query('SHOW INDEX FROM raport_bulanan')->fetchAll(PDO::FETCH_ASSOC);
            $hasSubjectUnique = false;
            $uniqueIndexes = [];
            foreach ($indexes as $idx) {
                if ((int) $idx['Non_unique'] === 0 && $idx['Key_name'] !== 'PRIMARY') {
                    $uniqueIndexes[$idx['Key_name']][(int) $idx['Seq_in_index']] = $idx['Column_name'];
                }
            }
            foreach ($uniqueIndexes as $colsBySeq) {
                ksort($colsBySeq);
                if (array_values($colsBySeq) === ['murid_id', 'tahun', 'bulan', 'pelajaran']) $hasSubjectUnique = true;
            }
            if (!$hasSubjectUnique) throw $e;
        }
    }
} catch (Throwable $e) {}

$murid_id   = isset($_POST['murid_id'])   ? (int) $_POST['murid_id']   : 0;
$tahun      = isset($_POST['tahun'])      ? (int) $_POST['tahun']      : 0;
$bulan      = isset($_POST['bulan'])      ? (int) $_POST['bulan']      : 0;
$pelajaran  = trim($_POST['pelajaran'] ?? '');
$bonus_poin = isset($_POST['bonus_poin']) ? (int) $_POST['bonus_poin'] : 0;
$catatan    = trim($_POST['catatan'] ?? '');
$manual_mode = isset($_POST['manual_mode']) && $_POST['manual_mode'] === '1';

$pelajaran = $pelajaran !== '' ? $pelajaran : trim($_POST['mapel'] ?? '');
if ($pelajaran === '') {
    $pelajaran = 'Umum';
}

if ($murid_id <= 0 || $tahun < 2000 || $tahun > 2100 || $bulan < 1 || $bulan > 12) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

if (mb_strlen($pelajaran) > 255) {
    $pelajaran = mb_substr($pelajaran, 0, 255);
}

function raport_clean_subject($raw) {
    $raw = (string) $raw;
    if (preg_match('/^\[(UJIAN|QUIZ)(?:\|[^\]]*)?\]\s*(.*)$/i', $raw, $m)) return trim($m[2]);
    if (preg_match('/^\[(UJIAN|QUIZ)(?::\d+)?\]\s*(.*)$/i', $raw, $m)) return trim($m[2]);
    return trim($raw);
}

if ($bonus_poin < -30 || $bonus_poin > 30) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Bonus poin harus antara -30 dan +30']);
    exit;
}

if ($manual_mode) {
    $rata_quiz = isset($_POST['nilai_quiz']) ? (int) $_POST['nilai_quiz'] : 0;
    $rata_tugas = isset($_POST['nilai_tugas']) ? (int) $_POST['nilai_tugas'] : 0;
    $persen_hadir = isset($_POST['nilai_kehadiran']) ? (int) $_POST['nilai_kehadiran'] : 0;

    foreach ([$rata_quiz, $rata_tugas, $persen_hadir] as $n) {
        if ($n < 0 || $n > 100) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nilai harus antara 0-100']);
            exit;
        }
    }
} else {
    // Rata-rata nilai quiz bulan ini
    $stmt = $pdo->prepare('SELECT nq.nilai, q.pelajaran FROM nilai_quiz nq
        JOIN quiz q ON q.id = nq.quiz_id
        WHERE nq.murid_id = ? AND MONTH(nq.tanggal) = ? AND YEAR(nq.tanggal) = ?');
    $stmt->execute([$murid_id, $bulan, $tahun]);
    $quizScores = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (strcasecmp(raport_clean_subject($row['pelajaran'] ?? ''), $pelajaran) === 0) $quizScores[] = (int) $row['nilai'];
    }
    $rata_quiz = count($quizScores) ? (int) round(array_sum($quizScores) / count($quizScores)) : 0;

    $stmt = $pdo->prepare('SELECT pt.nilai FROM pengumpulan_tugas pt
        JOIN bank_tugas bt ON bt.id = pt.tugas_id
        WHERE pt.murid_id = ? AND pt.nilai IS NOT NULL
        AND MONTH(pt.tanggal_upload) = ? AND YEAR(pt.tanggal_upload) = ? AND bt.pelajaran = ?');
    $stmt->execute([$murid_id, $bulan, $tahun, $pelajaran]);
    $tugasScores = array_map('intval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'nilai'));
    $rata_tugas = count($tugasScores) ? (int) round(array_sum($tugasScores) / count($tugasScores)) : 0;

    $stmt = $pdo->prepare('SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = "hadir" THEN 1 ELSE 0 END) AS hadir
        FROM absensi_murid WHERE murid_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?');
    $stmt->execute([$murid_id, $bulan, $tahun]);
    $absensi = $stmt->fetch();
    $persen_hadir = ($absensi['total'] > 0) ? (int) round(($absensi['hadir'] / $absensi['total']) * 100) : 0;
}

// Hitung nilai akhir: quiz 40% + tugas 40% + kehadiran 20% + bonus
$nilai_akhir = (int) round(($rata_quiz * 0.4) + ($rata_tugas * 0.4) + ($persen_hadir * 0.2) + $bonus_poin);
$nilai_akhir = max(0, min(100, $nilai_akhir));

$pdo->prepare('INSERT INTO raport_bulanan
    (murid_id, tahun, bulan, pelajaran, nilai_akhir, nilai_quiz, nilai_tugas, nilai_kehadiran, bonus_poin, catatan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        pelajaran       = VALUES(pelajaran),
        nilai_akhir    = VALUES(nilai_akhir),
        nilai_quiz     = VALUES(nilai_quiz),
        nilai_tugas    = VALUES(nilai_tugas),
        nilai_kehadiran= VALUES(nilai_kehadiran),
        bonus_poin     = VALUES(bonus_poin),
        catatan        = VALUES(catatan)')
    ->execute([$murid_id, $tahun, $bulan, $pelajaran, $nilai_akhir, $rata_quiz, $rata_tugas, $persen_hadir, $bonus_poin, $catatan ?: null]);

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
