<?php
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?tab=register&error=' . urlencode('Metode tidak valid'));
    exit;
}

csrf_verify();

$nama = trim($_POST['nama'] ?? '');
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$passwordConfirm = $_POST['password_confirm'] ?? '';
$kategori = $_POST['kategori'] ?? '';

$allowedKategori = ['pengajar', 'murid', 'tamu'];

if ($nama === '' || $username === '' || $password === '' || !in_array($kategori, $allowedKategori, true)) {
    header('Location: ../index.php?tab=register&error=' . urlencode('Data pendaftaran tidak valid'));
    exit;
}

if ($password !== $passwordConfirm) {
    header('Location: ../index.php?tab=register&error=' . urlencode('Password dan konfirmasi password tidak cocok'));
    exit;
}

if (strlen($password) < 6) {
    header('Location: ../index.php?tab=register&error=' . urlencode('Password minimal 6 karakter'));
    exit;
}

$fotoPath = '';
if (!empty($_FILES['foto']['name'])) {
    $uploadDir = '../uploads/foto_profil/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
    $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];

    if (!in_array($ext, $allowedExt, true)) {
        header('Location: ../index.php?tab=register&error=' . urlencode('Format foto tidak didukung'));
        exit;
    }

    $safeName = uniqid('foto_', true) . '.' . $ext;
    $targetPath = $uploadDir . $safeName;

    if (!move_uploaded_file($_FILES['foto']['tmp_name'], $targetPath)) {
        header('Location: ../index.php?tab=register&error=' . urlencode('Gagal mengunggah foto'));
        exit;
    }

    $fotoPath = 'uploads/foto_profil/' . $safeName;
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        header('Location: ../index.php?tab=register&error=' . urlencode('Username sudah digunakan'));
        exit;
    }

    $pdo->beginTransaction();

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (nama, username, password, kategori, foto) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$nama, $username, $hashedPassword, $kategori, $fotoPath]);
    $userId = (int) $pdo->lastInsertId();

    if ($kategori === 'pengajar') {
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

        $allowedTingkat = ['TK', 'SD', 'SMP'];
        if (!in_array($tingkat, $allowedTingkat, true)) {
            throw new RuntimeException('Tingkat murid tidak valid');
        }

        $stmt = $pdo->prepare('INSERT INTO murid (user_id, tingkat, umur, alamat) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, $tingkat, $umur ?: null, $alamat]);
    }

    $pdo->commit();
    header('Location: ../index.php?success=' . urlencode('Pendaftaran berhasil. Silakan login.'));
    exit;
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($fotoPath !== '' && file_exists('../' . $fotoPath)) {
        unlink('../' . $fotoPath);
    }

    header('Location: ../index.php?tab=register&error=' . urlencode('Pendaftaran gagal. Periksa data lalu coba lagi.'));
    exit;
}
?>
