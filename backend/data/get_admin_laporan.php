<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$topScores = $pdo->query("
    SELECT u.nama, u.username, ROUND(AVG(nq.nilai), 1) AS rata_nilai, COUNT(nq.id) AS total_quiz
    FROM nilai_quiz nq JOIN users u ON u.id = nq.murid_id
    GROUP BY nq.murid_id ORDER BY rata_nilai DESC LIMIT 10
")->fetchAll(PDO::FETCH_ASSOC);

$raport = $pdo->query("
    SELECT u.nama, rb.tahun, rb.bulan, rb.nilai_akhir, rb.nilai_quiz
    FROM raport_bulanan rb JOIN users u ON u.id = rb.murid_id
    ORDER BY rb.tahun DESC, rb.bulan DESC LIMIT 15
")->fetchAll(PDO::FETCH_ASSOC);

$ulasanRaw = $pdo->query("SELECT rating, COUNT(*) AS n FROM ulasan GROUP BY rating ORDER BY rating DESC")->fetchAll(PDO::FETCH_ASSOC);
$ulasan = [];
foreach ($ulasanRaw as $r) { $ulasan[(int) $r['rating']] = (int) $r['n']; }

$avgRating   = $pdo->query("SELECT AVG(rating) FROM ulasan")->fetchColumn();
$totalUlasan = (int) $pdo->query("SELECT COUNT(*) FROM ulasan")->fetchColumn();

echo json_encode([
    'top_scores'   => $topScores,
    'raport'       => $raport,
    'ulasan'       => $ulasan,
    'avg_rating'   => $avgRating ? round((float) $avgRating, 1) : null,
    'total_ulasan' => $totalUlasan,
]);
?>
