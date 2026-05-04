<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function api_user_payload() {
    return [
        'user' => $_SESSION['user'] ?? null,
        'detail' => $_SESSION['detail'] ?? null,
        'kategori' => $_SESSION['user']['kategori'] ?? null,
        'csrfToken' => csrf_token(),
    ];
}

function api_json($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function api_require_post() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        api_json(['success' => false, 'error' => 'Metode tidak valid'], 405);
    }
}

function api_verify_csrf() {
    $token = $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';

    if ($token === '' || $sessionToken === '' || !hash_equals($sessionToken, $token)) {
        api_json(['success' => false, 'error' => 'CSRF token tidak valid', 'csrfToken' => csrf_token()], 403);
    }
}

function api_teacher_registration_token() {
    $token = getenv('TEACHER_REGISTRATION_TOKEN');
    if (is_string($token) && trim($token) !== '') {
        return trim($token);
    }

    return '';
}

$action = $_GET['action'] ?? 'me';

if ($action === 'csrf' || $action === 'me') {
    api_json(['success' => true] + api_user_payload());
}

if ($action === 'logout') {
    api_require_post();
    api_verify_csrf();
    $_SESSION = [];
    session_destroy();
    api_json(['success' => true]);
}

if ($action === 'login') {
    api_require_post();
    api_verify_csrf();

    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        api_json(['success' => false, 'error' => 'Username dan password wajib diisi', 'csrfToken' => csrf_token()], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'] ?? '')) {
        log_security('Failed Next login attempt', ['username' => $username]);
        api_json(['success' => false, 'error' => 'Username atau password salah', 'csrfToken' => csrf_token()], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id' => $user['id'],
        'nama' => $user['nama'],
        'username' => $user['username'],
        'kategori' => $user['kategori'],
        'foto' => $user['foto'],
        'created_at' => $user['created_at']
    ];

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

    log_access('User login via Next frontend', $user['id'], ['kategori' => $user['kategori']]);
    api_json(['success' => true] + api_user_payload());
}

if ($action === 'register') {
    api_require_post();
    api_verify_csrf();

    $nama = trim($_POST['nama'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $passwordConfirm = $_POST['password_confirm'] ?? '';
    $kategori = $_POST['kategori'] ?? '';
    $allowedKategori = ['pengajar', 'murid', 'tamu'];

    if ($nama === '' || $username === '' || $password === '' || !in_array($kategori, $allowedKategori, true)) {
        api_json(['success' => false, 'error' => 'Data pendaftaran tidak valid', 'csrfToken' => csrf_token()], 400);
    }

    if ($password !== $passwordConfirm) {
        api_json(['success' => false, 'error' => 'Password dan konfirmasi password tidak cocok', 'csrfToken' => csrf_token()], 400);
    }

    if (strlen($password) < 6) {
        api_json(['success' => false, 'error' => 'Password minimal 6 karakter', 'csrfToken' => csrf_token()], 400);
    }

    try {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            api_json(['success' => false, 'error' => 'Username sudah digunakan', 'csrfToken' => csrf_token()], 409);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('INSERT INTO users (nama, username, password, kategori, foto) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$nama, $username, password_hash($password, PASSWORD_DEFAULT), $kategori, '']);
        $userId = (int) $pdo->lastInsertId();

        if ($kategori === 'pengajar') {
            $teacherToken = trim($_POST['teacher_token'] ?? '');
            if ($teacherToken === '') {
                throw new RuntimeException('Token pendaftaran pengajar wajib diisi');
            }

            // Check DB tokens first (admin-managed)
            $stmtTok = $pdo->prepare('SELECT id FROM teacher_tokens WHERE token = ? AND aktif = 1');
            $stmtTok->execute([$teacherToken]);
            $dbTokenValid = (bool) $stmtTok->fetch();

            // Fall back to env / hardcoded master token
            $masterToken = api_teacher_registration_token();
            if (!$dbTokenValid && ($masterToken === '' || !hash_equals($masterToken, $teacherToken))) {
                throw new RuntimeException('Token admin pengajar tidak valid');
            }

            $universitas = trim($_POST['universitas'] ?? '');
            $bidang = trim($_POST['bidang'] ?? '');
            if ($universitas === '' || $bidang === '') {
                throw new RuntimeException('Data pengajar belum lengkap');
            }
            $stmt = $pdo->prepare('INSERT INTO pengajar (user_id, universitas, bidang) VALUES (?, ?, ?)');
            $stmt->execute([$userId, $universitas, $bidang]);
        }

        if ($kategori === 'murid') {
            $tingkat = $_POST['tingkat'] ?? '';
            $umur = isset($_POST['umur']) ? (int) $_POST['umur'] : null;
            $alamat = trim($_POST['alamat'] ?? '');
            if (!in_array($tingkat, ['TK', 'SD', 'SMP', 'SMA'], true)) {
                throw new RuntimeException('Tingkat murid wajib dipilih');
            }
            $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?, ?, ?, ?)');
            $stmt->execute([$userId, $tingkat, $umur ?: null, $alamat]);
        }

        $pdo->commit();
        api_json(['success' => true, 'message' => 'Pendaftaran berhasil. Silakan login.', 'csrfToken' => csrf_token()]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        log_error('Next registration failed', ['error' => $e->getMessage(), 'username' => $username]);
        $message = $e instanceof RuntimeException ? $e->getMessage() : 'Pendaftaran gagal. Periksa data lalu coba lagi.';
        api_json(['success' => false, 'error' => $message, 'csrfToken' => csrf_token()], 400);
    }
}

if ($action === 'setup-admin') {
    api_require_post();

    $secret = $_POST['setup_secret'] ?? '';
    $envSecret = getenv('ADMIN_SETUP_SECRET');
    if (!is_string($envSecret) || trim($envSecret) === '' || !hash_equals(trim($envSecret), $secret)) {
        api_json(['success' => false, 'error' => 'Secret tidak valid'], 403);
    }

    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE kategori = 'admin'");
    if ((int) $stmt->fetchColumn() > 0) {
        api_json(['success' => false, 'error' => 'Akun admin sudah ada'], 409);
    }

    $nama     = trim($_POST['nama'] ?? 'Administrator');
    $username = trim($_POST['username'] ?? 'admin');
    $password = $_POST['password'] ?? '';

    if ($username === '' || strlen($password) < 6) {
        api_json(['success' => false, 'error' => 'Username wajib diisi dan password minimal 6 karakter'], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO users (nama, username, password, kategori) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$nama, $username, password_hash($password, PASSWORD_DEFAULT)]);
    api_json(['success' => true, 'message' => "Akun admin '$username' berhasil dibuat. Silakan login."]);
}

api_json(['success' => false, 'error' => 'Action tidak dikenal'], 404);
?>
