<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['tamu', 'admin']);

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS donasi_bukti (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        nama VARCHAR(100) NOT NULL,
        nominal INT NOT NULL DEFAULT 0,
        catatan TEXT NULL,
        file_path VARCHAR(255) NOT NULL,
        status ENUM('menunggu','diterima','ditolak') DEFAULT 'menunggu',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )");
} catch (Throwable $e) {
    log_error('Donasi monitor table check failed', ['error' => $e->getMessage()]);
}

if (current_role() === 'admin') {
    $stmt = $pdo->query("SELECT db.id, db.user_id, db.nama, db.nominal, db.catatan, db.file_path, db.status, db.created_at, u.username
        FROM donasi_bukti db
        LEFT JOIN users u ON u.id = db.user_id
        ORDER BY db.created_at DESC, db.id DESC
        LIMIT 200");
    echo json_encode(['success' => true, 'items' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

$userId = (int) ($_SESSION['user']['id'] ?? 0);
$stmt = $pdo->prepare("SELECT id, nama, nominal, catatan, file_path, status, created_at
    FROM donasi_bukti
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 50");
$stmt->execute([$userId]);
echo json_encode(['success' => true, 'items' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
?>
