<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$user = $_SESSION['user'];
$kategori = $user['kategori'] ?? '';

if ($kategori === 'pengajar') {
    $stmt = $pdo->query("SELECT u.nama, rb.murid_id, rb.tahun, rb.bulan, rb.nilai_akhir, rb.nilai_quiz
                         FROM raport_bulanan rb
                         JOIN users u ON u.id = rb.murid_id
                         ORDER BY rb.tahun DESC, rb.bulan DESC, u.nama ASC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($kategori === 'murid') {
    $stmt = $pdo->prepare("SELECT rb.murid_id, rb.tahun, rb.bulan, rb.nilai_akhir, rb.nilai_quiz
                           FROM raport_bulanan rb
                           WHERE rb.murid_id = ?
                           ORDER BY rb.tahun DESC, rb.bulan DESC");
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

echo json_encode([]);
?>
