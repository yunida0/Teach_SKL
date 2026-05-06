<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

require_role_json(['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak valid']);
    exit;
}

$csrfToken = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';
if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'CSRF token tidak valid']);
    exit;
}

$targetId = (int) ($_POST['user_id'] ?? 0);
$adminId  = (int) $_SESSION['user']['id'];

if ($targetId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID pengguna tidak valid']);
    exit;
}

if ($targetId === $adminId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tidak dapat menghapus akun sendiri']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, kategori, foto FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$targetId]);
$target = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$target) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Pengguna tidak ditemukan']);
    exit;
}

try {
    $pdo->beginTransaction();

    $tableChecks = [
        ['pengumpulan_tugas', 'murid_id'],
        ['raport_bulanan', 'murid_id'],
        ['raport', 'murid_id'],
        ['nilai_quiz', 'murid_id'],
        ['absensi_murid', 'murid_id'],
        ['absensi_pengajar', 'pengajar_id'],
        ['ebook', 'uploaded_by'],
        ['murid', 'user_id'],
        ['pengajar', 'user_id'],
    ];

    foreach ($tableChecks as [$table, $column]) {
        $exists = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
        $exists->execute([$table, $column]);
        if ((int) $exists->fetchColumn() > 0) {
            $delete = $pdo->prepare("DELETE FROM `$table` WHERE `$column` = ?");
            $delete->execute([$targetId]);
        }
    }

    $deleteUser = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $deleteUser->execute([$targetId]);

    if ($deleteUser->rowCount() < 1) {
        throw new RuntimeException('Pengguna gagal dihapus');
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_error('Admin delete user failed', ['error' => $e->getMessage(), 'user_id' => $targetId]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal menghapus pengguna karena data terkait belum bisa dibersihkan']);
    exit;
}

$foto = trim((string) ($target['foto'] ?? ''));
if ($foto !== '' && !preg_match('#^https?://#i', $foto)) {
    $relative = ltrim(str_replace('\\', '/', $foto), '/');
    if (str_starts_with($relative, 'uploads/')) {
        $filePath = realpath(__DIR__ . '/../../' . $relative);
        $uploadRoot = realpath(__DIR__ . '/../../uploads');
        if ($filePath && $uploadRoot && str_starts_with($filePath, $uploadRoot) && is_file($filePath)) {
            @unlink($filePath);
        }
    }
}

echo json_encode(['success' => true, 'message' => 'Pengguna berhasil dihapus']);
?>
