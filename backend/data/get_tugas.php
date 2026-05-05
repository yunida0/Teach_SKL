<?php
require_once __DIR__ . '/../../config/database.php';

require_role_json(['pengajar', 'murid', 'admin']);

$role = current_role();

if ($role === 'murid') {
    $tingkat = trim($_SESSION['detail']['tingkat'] ?? $_SESSION['user']['tingkat'] ?? '');
    if ($tingkat !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bank_tugas WHERE tingkat = ? OR tingkat = '' OR tingkat IS NULL OR tingkat = 'Umum' ORDER BY deadline DESC");
        $stmt->execute([$tingkat]);
    } else {
        $stmt = $pdo->query("SELECT * FROM bank_tugas ORDER BY deadline DESC");
    }
} else {
    $stmt = $pdo->query("SELECT * FROM bank_tugas ORDER BY deadline DESC");
}

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
