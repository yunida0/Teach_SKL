<?php
require_once __DIR__ . '/../../config/database.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Pastikan kolom baru ada
try {
    $existingCols = array_column(
        $pdo->query('SHOW COLUMNS FROM raport_bulanan')->fetchAll(PDO::FETCH_ASSOC),
        'Field'
    );
    $toAdd = [];
    if (!in_array('nilai_tugas', $existingCols, true))     $toAdd[] = 'ADD COLUMN nilai_tugas INT DEFAULT 0';
    if (!in_array('nilai_kehadiran', $existingCols, true)) $toAdd[] = 'ADD COLUMN nilai_kehadiran INT DEFAULT 0';
    if (!in_array('bonus_poin', $existingCols, true))      $toAdd[] = 'ADD COLUMN bonus_poin INT DEFAULT 0';
    if (!in_array('catatan', $existingCols, true))         $toAdd[] = 'ADD COLUMN catatan TEXT NULL';
    if ($toAdd) $pdo->exec('ALTER TABLE raport_bulanan ' . implode(', ', $toAdd));
} catch (Throwable $e) {}

$user     = $_SESSION['user'];
$kategori = $user['kategori'] ?? '';

if ($kategori === 'pengajar') {
    $stmt = $pdo->query('SELECT u.nama, rb.murid_id, rb.tahun, rb.bulan,
        rb.nilai_akhir, rb.nilai_quiz,
        COALESCE(rb.nilai_tugas, 0)     AS nilai_tugas,
        COALESCE(rb.nilai_kehadiran, 0) AS nilai_kehadiran,
        COALESCE(rb.bonus_poin, 0)      AS bonus_poin,
        rb.catatan
        FROM raport_bulanan rb
        JOIN users u ON u.id = rb.murid_id
        ORDER BY rb.tahun DESC, rb.bulan DESC, u.nama ASC');
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($kategori === 'murid') {
    $stmt = $pdo->prepare('SELECT rb.murid_id, rb.tahun, rb.bulan,
        rb.nilai_akhir, rb.nilai_quiz,
        COALESCE(rb.nilai_tugas, 0)     AS nilai_tugas,
        COALESCE(rb.nilai_kehadiran, 0) AS nilai_kehadiran,
        COALESCE(rb.bonus_poin, 0)      AS bonus_poin,
        rb.catatan
        FROM raport_bulanan rb
        WHERE rb.murid_id = ?
        ORDER BY rb.tahun DESC, rb.bulan DESC');
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

echo json_encode([]);
?>
