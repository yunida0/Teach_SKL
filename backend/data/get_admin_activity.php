<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']) || $_SESSION['user']['kategori'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Akses ditolak']);
    exit;
}

$items = [];

function push_rows(&$items, $rows, $type, $titleKey, $metaBuilder) {
    foreach ($rows as $row) {
        $items[] = [
            'type' => $type,
            'title' => $row[$titleKey] ?? $type,
            'meta' => $metaBuilder($row),
            'time' => $row['created_at'] ?? $row['tanggal_upload'] ?? $row['tanggal'] ?? null,
        ];
    }
}

$rows = $pdo->query("SELECT nama, username, kategori, created_at FROM users ORDER BY created_at DESC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
push_rows($items, $rows, 'user', 'nama', fn($r) => 'User ' . ($r['kategori'] ?? '-') . ' @' . ($r['username'] ?? '-'));

$rows = $pdo->query("SELECT judul_materi, pelajaran, tanggal_upload FROM ebook ORDER BY tanggal_upload DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
push_rows($items, $rows, 'ebook', 'judul_materi', fn($r) => 'Materi ' . ($r['pelajaran'] ?? '-'));

$rows = $pdo->query("SELECT judul, tipe, tanggal_upload FROM dokumentasi ORDER BY tanggal_upload DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
push_rows($items, $rows, 'dokumentasi', 'judul', fn($r) => 'Dokumentasi ' . ($r['tipe'] ?? '-'));

$rows = $pdo->query("SELECT token, label, created_at FROM teacher_tokens ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
push_rows($items, $rows, 'token', 'label', fn($r) => 'Token pengajar dibuat');

usort($items, function ($a, $b) {
    return strtotime($b['time'] ?? '1970-01-01') <=> strtotime($a['time'] ?? '1970-01-01');
});

echo json_encode(array_slice($items, 0, 15));
?>
