<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'config/database.php';
if (!isset($_SESSION['user'])) {
    header("Location: index.php");
    exit;
}
$user = $_SESSION['user'];
$detail = $_SESSION['detail'] ?? null;
$kategori = $user['kategori'];
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Teach SKL - Dashboard</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="legacy/php-frontend/frontend/assets/css/style.css?v=2026042609">
</head>
<body class="dashboard-page">
    <div class="app">
        <aside class="sidebar">
            <div class="sidebar-head">
                <div class="portal-logo" aria-hidden="true">T</div>
                <h2 class="brand-mark">Teach SKL</h2>
                <p class="brand-subtitle">Student Learning Portal</p>
            </div>
            <div class="user-info">
                <img src="<?= $user['foto'] ?: 'https://via.placeholder.com/50' ?>" class="avatar" id="avatarPreview">
                <p><?= htmlspecialchars($user['nama']) ?></p>
                <small><?= ucfirst($kategori) ?></small>
            </div>
            <nav>
                <a href="#" data-page="dashboard">Dashboard</a>
                <a href="#" data-page="profil">Profil</a>
                <a href="#" data-page="ebook">E-Book</a>
                <?php if ($kategori != 'tamu'): ?>
                <a href="#" data-page="banktugas">Bank Tugas</a>
                <a href="#" data-page="quiz">Quiz</a>
                <a href="#" data-page="pointmurid">Point Murid</a>
                <?php endif; ?>
                <?php if ($kategori == 'pengajar'): ?>
                <a href="#" data-page="daftarmurid">Daftar Murid</a>
                <a href="#" data-page="absensimurid">Absensi Murid</a>
                <a href="#" data-page="absensipengajar">Absensi Pengajar</a>
                <a href="#" data-page="raport">Input Raport</a>
                <a href="#" data-page="dokumentasi">Dokumentasi</a>
                <?php elseif ($kategori == 'murid'): ?>
                <a href="#" data-page="absensimurid">Absensi Saya</a>
                <a href="#" data-page="raport">Raport Saya</a>
                <a href="#" data-page="dokumentasi">Dokumentasi</a>
                <?php elseif ($kategori == 'tamu'): ?>
                <a href="#" data-page="dokumentasi">Dokumentasi</a>
                <a href="#" data-page="ulasan">Beri Ulasan</a>
                <?php endif; ?>
            </nav>
            <a href="backend/logout.php" class="logout-btn">Keluar</a>
        </aside>
        <main class="main-content">
            <header class="dashboard-topbar">
                <h1 id="dashboardTitle">Dashboard</h1>
                <div class="study-period" aria-label="Sisa Masa Studi Ideal">
                    <span>Sisa Masa Studi Ideal</span>
                    <strong>3 th</strong>
                    <strong>4 bl</strong>
                    <strong>5 hr</strong>
                </div>
            </header>
            <div id="flashMessage"></div>
            <div id="pageContent"></div>
        </main>
    </div>
    <script>
        window.currentUser = <?= json_encode($user, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
        window.userDetail = <?= json_encode($detail, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
        window.userKategori = <?= json_encode($kategori, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
        window.userCreatedAt = <?= json_encode($user['created_at'] ?? null, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
    </script>
    <!-- Modular JS Architecture -->
    <script src="legacy/php-frontend/frontend/assets/js/calendar-utils.js?v=2026042611"></script>
    <script src="legacy/php-frontend/frontend/assets/js/modules/utils.js?v=2026042611"></script>
    <script src="legacy/php-frontend/frontend/assets/js/modules/core.js?v=2026042611"></script>
    <script src="legacy/php-frontend/frontend/assets/js/modules/dashboard-page.js?v=2026042611"></script>
    <script src="legacy/php-frontend/frontend/assets/js/modules/profile.js?v=2026042611"></script>
    <!-- Main dashboard (remaining functions) -->
    <script src="legacy/php-frontend/frontend/assets/js/dashboard.js?v=2026042611"></script>
</body>
</html>
