<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['murid']);

$pelajaran = trim($_GET['pelajaran'] ?? '');
$muridId = (int) $_SESSION['user']['id'];
if ($pelajaran === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Quiz tidak valid']);
    exit;
}

try {
    $cols = $pdo->query('SHOW COLUMNS FROM nilai_quiz')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('jawaban_user', $cols, true)) {
        $pdo->exec("ALTER TABLE nilai_quiz ADD COLUMN jawaban_user VARCHAR(10) DEFAULT NULL");
    }
} catch (Throwable $e) {
    log_error('Nilai quiz answer column check failed', ['error' => $e->getMessage()]);
}

$stmt = $pdo->prepare("SELECT q.id, q.soal, q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, q.jawaban_benar,
    nq.nilai, nq.jawaban_user, nq.tanggal
    FROM quiz q
    LEFT JOIN nilai_quiz nq ON nq.quiz_id = q.id AND nq.murid_id = ?
    WHERE q.pelajaran = ?
    ORDER BY q.id ASC");
$stmt->execute([$muridId, $pelajaran]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$answered = 0;
$correct = 0;
foreach ($rows as $row) {
    if ($row['nilai'] !== null) {
        $answered++;
        if ((int)$row['nilai'] >= 100) $correct++;
    }
}
$total = count($rows);
$score = $total > 0 ? round(($correct / $total) * 100) : 0;

echo json_encode(['success' => true, 'total' => $total, 'answered' => $answered, 'correct' => $correct, 'wrong' => max(0, $answered - $correct), 'score' => $score, 'answers' => $rows]);
?>
