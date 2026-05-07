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

echo json_encode([
    'success'  => true,
    'benar'    => $is_benar,
    'nilai'    => $nilai,
    'feedback' => $is_benar ? 'Jawaban benar!' : 'Jawaban salah.',
]);
?>
