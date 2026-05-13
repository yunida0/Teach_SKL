<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'murid') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Hanya murid yang bisa mengerjakan quiz']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

csrf_verify();

try {
    $cols = $pdo->query('SHOW COLUMNS FROM nilai_quiz')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('jawaban_user', $cols, true)) {
        $pdo->exec("ALTER TABLE nilai_quiz ADD COLUMN jawaban_user VARCHAR(10) DEFAULT NULL");
    }
} catch (Throwable $e) {
    log_error('Nilai quiz answer column check failed', ['error' => $e->getMessage()]);
}

function raport_clean_subject_from_quiz($raw) {
    $raw = (string) $raw;
    if (preg_match('/^\[(UJIAN|QUIZ)(?:\|[^\]]*)?\]\s*(.*)$/i', $raw, $m)) return trim($m[2]);
    if (preg_match('/^\[(UJIAN|QUIZ)(?::\d+)?\]\s*(.*)$/i', $raw, $m)) return trim($m[2]);
    return trim($raw);
}

function ensure_raport_subject_schema(PDO $pdo) {
    $cols = $pdo->query('SHOW COLUMNS FROM raport_bulanan')->fetchAll(PDO::FETCH_COLUMN);
    $toAdd = [];
    if (!in_array('pelajaran', $cols, true)) $toAdd[] = "ADD COLUMN pelajaran VARCHAR(255) DEFAULT 'Umum' AFTER bulan";
    if (!in_array('nilai_tugas', $cols, true)) $toAdd[] = 'ADD COLUMN nilai_tugas INT DEFAULT 0';
    if (!in_array('nilai_kehadiran', $cols, true)) $toAdd[] = 'ADD COLUMN nilai_kehadiran INT DEFAULT 0';
    if (!in_array('bonus_poin', $cols, true)) $toAdd[] = 'ADD COLUMN bonus_poin INT DEFAULT 0';
    if (!in_array('catatan', $cols, true)) $toAdd[] = 'ADD COLUMN catatan TEXT NULL';
    if ($toAdd) $pdo->exec('ALTER TABLE raport_bulanan ' . implode(', ', $toAdd));

    $indexes = $pdo->query('SHOW INDEX FROM raport_bulanan')->fetchAll(PDO::FETCH_ASSOC);
    $uniqueIndexes = [];
    $hasMuridIndex = false;
    foreach ($indexes as $idx) {
        if ($idx['Key_name'] === 'idx_raport_murid') $hasMuridIndex = true;
        if ((int) $idx['Non_unique'] === 0 && $idx['Key_name'] !== 'PRIMARY') $uniqueIndexes[$idx['Key_name']][(int) $idx['Seq_in_index']] = $idx['Column_name'];
    }
    if (!$hasMuridIndex) $pdo->exec('ALTER TABLE raport_bulanan ADD INDEX idx_raport_murid (murid_id)');

    $hasSubjectUnique = false;
    foreach ($uniqueIndexes as $name => $colsBySeq) {
        ksort($colsBySeq);
        $cols = array_values($colsBySeq);
        if ($cols === ['murid_id', 'tahun', 'bulan', 'pelajaran']) $hasSubjectUnique = true;
        if ($cols === ['murid_id', 'tahun', 'bulan']) {
            $safeName = str_replace('`', '', $name);
            $pdo->exec("ALTER TABLE raport_bulanan DROP INDEX `$safeName`");
        }
    }
    if (!$hasSubjectUnique) {
        try { $pdo->exec('ALTER TABLE raport_bulanan ADD UNIQUE KEY uniq_raport_subject (murid_id, tahun, bulan, pelajaran)'); } catch (Throwable $e) {}
    }
}

function refresh_raport_after_quiz(PDO $pdo, int $muridId, string $pelajaran) {
    if ($pelajaran === '') $pelajaran = 'Umum';
    ensure_raport_subject_schema($pdo);
    $tahun = (int) date('Y');
    $bulan = (int) date('n');

    $stmt = $pdo->prepare('SELECT nq.nilai, q.pelajaran FROM nilai_quiz nq JOIN quiz q ON q.id = nq.quiz_id WHERE nq.murid_id = ? AND MONTH(nq.tanggal) = ? AND YEAR(nq.tanggal) = ?');
    $stmt->execute([$muridId, $bulan, $tahun]);
    $quizScores = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (strcasecmp(raport_clean_subject_from_quiz($row['pelajaran'] ?? ''), $pelajaran) === 0) $quizScores[] = (int) $row['nilai'];
    }
    $rataQuiz = count($quizScores) ? (int) round(array_sum($quizScores) / count($quizScores)) : 0;

    $stmt = $pdo->prepare('SELECT pt.nilai FROM pengumpulan_tugas pt JOIN bank_tugas bt ON bt.id = pt.tugas_id WHERE pt.murid_id = ? AND pt.nilai IS NOT NULL AND MONTH(pt.tanggal_upload) = ? AND YEAR(pt.tanggal_upload) = ? AND bt.pelajaran = ?');
    $stmt->execute([$muridId, $bulan, $tahun, $pelajaran]);
    $tugasScores = array_map('intval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'nilai'));
    $rataTugas = count($tugasScores) ? (int) round(array_sum($tugasScores) / count($tugasScores)) : 0;

    $stmt = $pdo->prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN status = "hadir" THEN 1 ELSE 0 END) AS hadir FROM absensi_murid WHERE murid_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?');
    $stmt->execute([$muridId, $bulan, $tahun]);
    $absensi = $stmt->fetch(PDO::FETCH_ASSOC);
    $hadir = ((int) ($absensi['total'] ?? 0) > 0) ? (int) round(((int) ($absensi['hadir'] ?? 0) / (int) $absensi['total']) * 100) : 0;

    $stmt = $pdo->prepare('SELECT bonus_poin, catatan FROM raport_bulanan WHERE murid_id = ? AND tahun = ? AND bulan = ? AND pelajaran = ? LIMIT 1');
    $stmt->execute([$muridId, $tahun, $bulan, $pelajaran]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $bonus = (int) ($existing['bonus_poin'] ?? 0);
    $catatan = $existing['catatan'] ?? null;
    $akhir = max(0, min(100, (int) round(($rataQuiz * 0.4) + ($rataTugas * 0.4) + ($hadir * 0.2) + $bonus)));

    $stmt = $pdo->prepare('INSERT INTO raport_bulanan (murid_id, tahun, bulan, pelajaran, nilai_akhir, nilai_quiz, nilai_tugas, nilai_kehadiran, bonus_poin, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nilai_akhir = VALUES(nilai_akhir), nilai_quiz = VALUES(nilai_quiz), nilai_tugas = VALUES(nilai_tugas), nilai_kehadiran = VALUES(nilai_kehadiran), bonus_poin = VALUES(bonus_poin), catatan = VALUES(catatan)');
    $stmt->execute([$muridId, $tahun, $bulan, $pelajaran, $akhir, $rataQuiz, $rataTugas, $hadir, $bonus, $catatan]);
}

$murid_id     = (int) $_SESSION['user']['id'];
$quiz_id      = isset($_POST['quiz_id']) ? (int) $_POST['quiz_id'] : 0;
$jawaban_user = strtoupper(trim($_POST['jawaban'] ?? ''));

if ($quiz_id <= 0 || ($jawaban_user !== '_' && !in_array($jawaban_user, ['A', 'B', 'C', 'D'], true))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Jawaban tidak valid']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM quiz WHERE id = ?');
$stmt->execute([$quiz_id]);
$quiz = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$quiz) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Quiz tidak ditemukan']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, nilai FROM nilai_quiz WHERE murid_id = ? AND quiz_id = ? LIMIT 1');
$stmt->execute([$murid_id, $quiz_id]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    try {
        refresh_raport_after_quiz($pdo, $murid_id, raport_clean_subject_from_quiz($quiz['pelajaran'] ?? ''));
    } catch (Throwable $e) {
        log_error('Raport refresh after existing quiz failed', ['error' => $e->getMessage()]);
    }
    echo json_encode([
        'success' => true,
        'already_answered' => true,
        'benar' => ((int) $existing['nilai']) >= 100,
        'nilai' => (int) $existing['nilai'],
        'feedback' => 'Soal sudah pernah dikerjakan.',
    ]);
    exit;
}

$is_benar = ($jawaban_user === $quiz['jawaban_benar']);
$nilai    = $is_benar ? 100 : 0;

$pdo->prepare('INSERT INTO nilai_quiz (murid_id, quiz_id, nilai, jawaban_user) VALUES (?, ?, ?, ?)')
    ->execute([$murid_id, $quiz_id, $nilai, $jawaban_user]);

try {
    refresh_raport_after_quiz($pdo, $murid_id, raport_clean_subject_from_quiz($quiz['pelajaran'] ?? ''));
} catch (Throwable $e) {
    log_error('Raport refresh after quiz failed', ['error' => $e->getMessage()]);
}

echo json_encode([
    'success'  => true,
    'benar'    => $is_benar,
    'nilai'    => $nilai,
    'feedback' => $is_benar ? 'Jawaban benar!' : 'Jawaban salah.',
]);
?>
