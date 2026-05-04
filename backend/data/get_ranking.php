<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['murid', 'pengajar', 'admin']);

if ($_SESSION['user']['kategori'] === 'murid' && ($_GET['scope'] ?? '') === 'me') {
    $muridId = (int) $_SESSION['user']['id'];
    $stmt = $pdo->prepare("SELECT u.nama, COALESCE(SUM(nq.nilai), 0) as total_nilai, COUNT(nq.id) as jumlah_quiz, COALESCE(AVG(nq.nilai), 0) as rata_rata
                          FROM users u
                          LEFT JOIN nilai_quiz nq ON nq.murid_id = u.id
                          WHERE u.id = ?
                          GROUP BY u.id");
    $stmt->execute([$muridId]);
    echo json_encode($stmt->fetch() ?: ['total_nilai' => 0, 'jumlah_quiz' => 0, 'rata_rata' => 0]);
    exit;
}

if ($_SESSION['user']['kategori'] === 'murid') {
    json_forbidden('Akses ditolak', 403);
}

$stmt = $pdo->query("SELECT u.nama, SUM(nq.nilai) as total_nilai, COUNT(nq.id) as jumlah_quiz, AVG(nq.nilai) as rata_rata 
                     FROM nilai_quiz nq 
                     JOIN users u ON nq.murid_id = u.id 
                     GROUP BY nq.murid_id 
                     ORDER BY total_nilai DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
