<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['pengajar', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_forbidden('Metode tidak valid', 405);
}

csrf_verify();

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$nilai = isset($_POST['nilai']) && $_POST['nilai'] !== '' ? (int) $_POST['nilai'] : null;
$feedback = trim($_POST['feedback'] ?? '');

if ($id <= 0 || $nilai === null || $nilai < 0 || $nilai > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nilai harus 0-100']);
    exit;
}

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

$stmt = $pdo->prepare('UPDATE pengumpulan_tugas SET nilai = ?, feedback = ?, tanggal_nilai = NOW() WHERE id = ?');
$stmt->execute([$nilai, $feedback, $id]);

if ($stmt->rowCount() < 1) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Pengumpulan tidak ditemukan']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Nilai tersimpan']);
?>
