<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'murid', 'admin']);

$pdo->exec("CREATE TABLE IF NOT EXISTS pengumpulan_tugas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tugas_id INT NOT NULL,
    murid_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    catatan TEXT NULL,
    nilai INT NULL,
    feedback TEXT NULL,
    tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tanggal_nilai TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uniq_tugas_murid (tugas_id, murid_id)
)");

$role = current_role();

if ($role === 'murid') {
    $stmt = $pdo->prepare('SELECT p.*, b.judul_tugas, b.pelajaran, b.deadline FROM pengumpulan_tugas p
        JOIN bank_tugas b ON b.id = p.tugas_id
        WHERE p.murid_id = ?
        ORDER BY p.tanggal_upload DESC');
    $stmt->execute([(int) $_SESSION['user']['id']]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

$stmt = $pdo->query("SELECT p.*, u.nama AS nama_murid, u.username, b.judul_tugas, b.pelajaran, b.deadline
    FROM pengumpulan_tugas p
    JOIN users u ON u.id = p.murid_id
    JOIN bank_tugas b ON b.id = p.tugas_id
    ORDER BY p.tanggal_upload DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
