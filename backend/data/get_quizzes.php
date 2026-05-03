<?php
require_once __DIR__ . '/../../config/database.php';
$isPengajar = isset($_SESSION['user']) && $_SESSION['user']['kategori'] === 'pengajar';
$isMurid = isset($_SESSION['user']) && $_SESSION['user']['kategori'] === 'murid';

if ($isPengajar) {
    $stmt = $pdo->query("SELECT * FROM quiz ORDER BY pelajaran ASC, id DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($isMurid) {
    $muridId = (int) $_SESSION['user']['id'];
    $stmt = $pdo->prepare("SELECT q.id, q.pelajaran, q.soal, q.tipe, q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d,
        CASE WHEN nq.id IS NULL THEN 0 ELSE 1 END AS sudah_dikerjakan,
        nq.nilai
        FROM quiz q
        LEFT JOIN nilai_quiz nq ON nq.quiz_id = q.id AND nq.murid_id = ?
        ORDER BY q.pelajaran ASC, q.id DESC");
    $stmt->execute([$muridId]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

$stmt = $pdo->query("SELECT id, pelajaran, soal, tipe, opsi_a, opsi_b, opsi_c, opsi_d FROM quiz ORDER BY pelajaran ASC, id DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
