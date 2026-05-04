<?php
$host = 'localhost';
$dbname = 'tech_skl';
$username = 'root';
$password = '';

$sessionLifetime = 60 * 60 * 8;
ini_set('session.gc_maxlifetime', (string) $sessionLifetime);
session_set_cookie_params([
    'lifetime' => $sessionLifetime,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    die('Koneksi gagal: ' . $e->getMessage());
}

session_start();

// Load helpers
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/logging.php';

function json_forbidden(string $message = 'Akses ditolak', int $statusCode = 403): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

function current_role(): ?string {
    return $_SESSION['user']['kategori'] ?? null;
}

function require_login_json(): void {
    if (!isset($_SESSION['user'])) {
        json_forbidden('Unauthorized', 401);
    }
}

function require_role_json(array $roles): void {
    require_login_json();
    if (!in_array(current_role(), $roles, true)) {
        json_forbidden('Akses ditolak', 403);
    }
}
?>
