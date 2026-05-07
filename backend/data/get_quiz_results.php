<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'admin']);

$pelajaran = trim($_GET['pelajaran'] ?? '');
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

$stmt = $pdo->prepare("SELECT q.id AS quiz_id, q.soal, q.tipe, q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, q.jawaban_benar,
    nq.id AS nilai_id, nq.murid_id, nq.nilai, nq.jawaban_user, nq.tanggal,
    u.nama AS nama_murid, u.username
    FROM quiz q
    LEFT JOIN nilai_quiz nq ON nq.quiz_id = q.id
    LEFT JOIN users u ON u.id = nq.murid_id
    WHERE q.pelajaran = ?
    ORDER BY u.nama ASC, q.id ASC");
$stmt->execute([$pelajaran]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$students = [];
$questions = [];
foreach ($rows as $row) {
    $questions[(string)$row['quiz_id']] = [
        'id' => $row['quiz_id'],
        'soal' => $row['soal'],
        'jawaban_benar' => $row['jawaban_benar'],
        'opsi_a' => $row['opsi_a'],
        'opsi_b' => $row['opsi_b'],
        'opsi_c' => $row['opsi_c'],
        'opsi_d' => $row['opsi_d'],
    ];
    if (!$row['murid_id']) continue;
    $key = (string)$row['murid_id'];
    if (!isset($students[$key])) {
        $students[$key] = [
            'murid_id' => $row['murid_id'],
            'nama_murid' => $row['nama_murid'],
            'username' => $row['username'],
            'answered' => 0,
            'correct' => 0,
            'wrong' => 0,
            'score' => 0,
            'answers' => [],
        ];
    }
    $nilai = (int)$row['nilai'];
    $students[$key]['answered']++;
    if ($nilai >= 100) $students[$key]['correct']++; else $students[$key]['wrong']++;
    $students[$key]['answers'][] = [
        'quiz_id' => $row['quiz_id'],
        'soal' => $row['soal'],
        'jawaban_user' => $row['jawaban_user'],
        'jawaban_benar' => $row['jawaban_benar'],
        'nilai' => $nilai,
        'is_correct' => $nilai >= 100,
        'tanggal' => $row['tanggal'],
    ];
}

$totalQuestions = count($questions);
foreach ($students as &$student) {
    $student['score'] = $totalQuestions > 0 ? round(($student['correct'] / $totalQuestions) * 100) : 0;
}
unset($student);

echo json_encode(['success' => true, 'total_questions' => $totalQuestions, 'students' => array_values($students), 'questions' => array_values($questions)]);
?>
