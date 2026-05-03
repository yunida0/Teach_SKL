<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

$user = $_SESSION['user'];

if ($user['kategori'] === 'pengajar') {
    $stmt = $pdo->query(
        "SELECT u.nama, nq.quiz_id, q.soal, q.pelajaran, nq.nilai, nq.tanggal
         FROM nilai_quiz nq
         JOIN users u ON nq.murid_id = u.id
         JOIN quiz q ON nq.quiz_id = q.id
         ORDER BY nq.tanggal DESC"
    );
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($user['kategori'] === 'murid') {
    $stmt = $pdo->prepare(
        "SELECT nq.quiz_id, q.soal, q.pelajaran, nq.nilai, nq.tanggal
         FROM nilai_quiz nq
         JOIN quiz q ON nq.quiz_id = q.id
         WHERE nq.murid_id = ?
         ORDER BY nq.tanggal DESC"
    );
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

echo json_encode([]);
?>
