<?php
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?error=' . urlencode('Metode tidak valid'));
    exit;
}

csrf_verify();

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
    header('Location: ../index.php?error=' . urlencode('Username dan password wajib diisi'));
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();

$isValid = false;
if ($user) {
    $storedPassword = $user['password'] ?? '';
    $isValid = password_verify($password, $storedPassword);
}

if (!$isValid) {
    log_security('Failed login attempt', ['username' => $username]);
    header('Location: ../index.php?error=' . urlencode('Username atau password salah'));
    exit;
}

session_regenerate_id(true);

// Store only necessary user data (exclude password hash)
$_SESSION['user'] = [
    'id' => $user['id'],
    'nama' => $user['nama'],
    'username' => $user['username'],
    'kategori' => $user['kategori'],
    'foto' => $user['foto'],
    'created_at' => $user['created_at']
];

log_access('User login', $user['id'], ['kategori' => $user['kategori']]);

if ($user['kategori'] === 'pengajar') {
    $stmt = $pdo->prepare('SELECT * FROM pengajar WHERE user_id = ? LIMIT 1');
    $stmt->execute([$user['id']]);
    $_SESSION['detail'] = $stmt->fetch();
} elseif ($user['kategori'] === 'murid') {
    $stmt = $pdo->prepare('SELECT * FROM murid WHERE user_id = ? LIMIT 1');
    $stmt->execute([$user['id']]);
    $_SESSION['detail'] = $stmt->fetch();
} else {
    unset($_SESSION['detail']);
}

header('Location: ../dashboard.php');
exit;
?>
