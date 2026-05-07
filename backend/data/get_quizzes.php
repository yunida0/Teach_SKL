<?php
require_once __DIR__ . '/../../config/database.php';
$isPengajar = isset($_SESSION['user']) && $_SESSION['user']['kategori'] === 'pengajar';
$isMurid = isset($_SESSION['user']) && $_SESSION['user']['kategori'] === 'murid';

if (!$isPengajar && !$isMurid) {
    require_role_json(['pengajar', 'murid']);
}

try {
    $cols = $pdo->query('SHOW COLUMNS FROM quiz')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('poin', $cols, true)) {
        $pdo->exec("ALTER TABLE quiz ADD COLUMN poin INT NOT NULL DEFAULT 10");
    }
    $pdo->exec("UPDATE quiz SET poin = 10 WHERE poin IS NULL OR poin < 1");
} catch (Throwable $e) {
    log_error('Quiz poin column check failed', ['error' => $e->getMessage()]);
}

if ($isPengajar) {
    $stmt = $pdo->query("SELECT q.*, COALESCE(q.poin, 10) AS poin FROM quiz q ORDER BY q.pelajaran ASC, q.id DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($isMurid) {
    $muridId = (int) $_SESSION['user']['id'];
    $tingkat = trim($_SESSION['detail']['tingkat'] ?? $_SESSION['user']['tingkat'] ?? '');
    if ($tingkat !== '') {
        $stmt = $pdo->prepare("SELECT q.id, q.pelajaran, q.soal, q.tipe, q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, COALESCE(q.poin, 10) AS poin,
            CASE WHEN nq.id IS NULL THEN 0 ELSE 1 END AS sudah_dikerjakan,
            nq.nilai
            FROM quiz q
            LEFT JOIN nilai_quiz nq ON nq.quiz_id = q.id AND nq.murid_id = ?
            WHERE q.tingkat = ? OR q.tingkat = '' OR q.tingkat IS NULL OR q.tingkat = 'Umum'
            ORDER BY q.pelajaran ASC, q.id DESC");
        $stmt->execute([$muridId, $tingkat]);
    } else {
        $stmt = $pdo->prepare("SELECT q.id, q.pelajaran, q.soal, q.tipe, q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, COALESCE(q.poin, 10) AS poin,
            CASE WHEN nq.id IS NULL THEN 0 ELSE 1 END AS sudah_dikerjakan,
            nq.nilai
            FROM quiz q
            LEFT JOIN nilai_quiz nq ON nq.quiz_id = q.id AND nq.murid_id = ?
            ORDER BY q.pelajaran ASC, q.id DESC");
        $stmt->execute([$muridId]);
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

json_forbidden('Akses ditolak', 403);
?>
