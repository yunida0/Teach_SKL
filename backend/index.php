<?php
/**
 * Teach SKL backend router.
 *
 * Clean routes:
 * - /backend/auth/api?action=me
 * - /backend/data/stats
 * - /backend/uploads/ebook
 *
 * Legacy routes such as /backend/get_stats.php are still supported here,
 * so old PHP pages and gradual migrations keep working.
 */

$route = $_GET['route'] ?? '';

if ($route === '') {
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
    $requestPath = str_replace('\\', '/', $requestPath);
    $backendBase = rtrim(str_replace('/index.php', '', $scriptName), '/');

    if ($backendBase !== '' && str_starts_with($requestPath, $backendBase)) {
        $route = substr($requestPath, strlen($backendBase));
    } else {
        $route = $requestPath;
    }
}

$route = trim(str_replace('\\', '/', $route), '/');
if (str_starts_with($route, 'backend/')) {
    $route = substr($route, strlen('backend/'));
}
if (str_ends_with($route, '.php')) {
    $route = substr($route, 0, -4);
}

$routes = [
    // Auth
    'auth/api' => 'auth/api_auth.php',
    'auth/api-auth' => 'auth/api_auth.php',
    'api_auth' => 'auth/api_auth.php',
    'auth/login' => 'auth/login.php',
    'login' => 'auth/login.php',
    'auth/register' => 'auth/register.php',
    'register' => 'auth/register.php',
    'auth/logout' => 'auth/logout.php',
    'logout' => 'auth/logout.php',
    'auth/delete-account' => 'auth/hapus_akun.php',
    'hapus_akun' => 'auth/hapus_akun.php',

    // Data reads
    'data/absensi-form' => 'data/get_absensi_form.php',
    'get_absensi_form' => 'data/get_absensi_form.php',
    'data/absensi-saya' => 'data/get_absensi_saya.php',
    'get_absensi_saya' => 'data/get_absensi_saya.php',
    'data/daftar-murid' => 'data/get_daftar_murid.php',
    'get_daftar_murid' => 'data/get_daftar_murid.php',
    'data/dokumentasi' => 'data/get_dokumentasi.php',
    'get_dokumentasi' => 'data/get_dokumentasi.php',
    'data/ebooks' => 'data/get_ebooks.php',
    'get_ebooks' => 'data/get_ebooks.php',
    'data/murid-for-absensi' => 'data/get_murid_for_absensi.php',
    'get_murid_for_absensi' => 'data/get_murid_for_absensi.php',
    'data/murids' => 'data/get_murids.php',
    'get_murids' => 'data/get_murids.php',
    'data/nilai-quiz-murid' => 'data/get_nilai_quiz_murid.php',
    'data/nilai-ujian-murid' => 'data/get_nilai_quiz_murid.php',
    'get_nilai_quiz_murid' => 'data/get_nilai_quiz_murid.php',
    'data/quizzes' => 'data/get_quizzes.php',
    'data/ujian' => 'data/get_quizzes.php',
    'data/ujian-berproteksi' => 'data/get_quizzes.php',
    'get_quizzes' => 'data/get_quizzes.php',
    'data/ranking' => 'data/get_ranking.php',
    'get_ranking' => 'data/get_ranking.php',
    'data/raport' => 'data/get_raport.php',
    'get_raport' => 'data/get_raport.php',
    'data/riwayat-absensi-pengajar' => 'data/get_riwayat_absensi_pengajar.php',
    'get_riwayat_absensi_pengajar' => 'data/get_riwayat_absensi_pengajar.php',
    'data/riwayat-absensi' => 'data/get_riwayat_absensi.php',
    'get_riwayat_absensi' => 'data/get_riwayat_absensi.php',
    'data/stats' => 'data/get_stats.php',
    'get_stats' => 'data/get_stats.php',
    'data/tugas' => 'data/get_tugas.php',
    'get_tugas' => 'data/get_tugas.php',
    'data/pengumpulan-tugas' => 'data/get_pengumpulan_tugas.php',
    'get_pengumpulan_tugas' => 'data/get_pengumpulan_tugas.php',
    'data/ulasan' => 'data/get_ulasan.php',
    'get_ulasan' => 'data/get_ulasan.php',

    // Actions
    'actions/input-raport' => 'actions/input_nilai_raport.php',
    'input_nilai_raport' => 'actions/input_nilai_raport.php',
    'actions/jawab-quiz' => 'actions/jawab_quiz.php',
    'actions/jawab-ujian' => 'actions/jawab_quiz.php',
    'actions/jawab-ujian-berproteksi' => 'actions/jawab_quiz.php',
    'jawab_quiz' => 'actions/jawab_quiz.php',
    'jawab_ujian' => 'actions/jawab_quiz.php',
    'actions/reset-absensi' => 'actions/reset_absensi.php',
    'reset_absensi' => 'actions/reset_absensi.php',
    'actions/tambah-absensi' => 'actions/tambah_absensi.php',
    'tambah_absensi' => 'actions/tambah_absensi.php',
    'actions/tambah-absensi-murid' => 'actions/tambah_absensi_murid.php',
    'tambah_absensi_murid' => 'actions/tambah_absensi_murid.php',
    'actions/tambah-absensi-pengajar' => 'actions/tambah_absensi_pengajar.php',
    'tambah_absensi_pengajar' => 'actions/tambah_absensi_pengajar.php',
    'actions/tambah-murid' => 'actions/tambah_murid.php',
    'tambah_murid' => 'actions/tambah_murid.php',
    'actions/tambah-quiz' => 'actions/tambah_quiz.php',
    'actions/tambah-ujian' => 'actions/tambah_quiz.php',
    'actions/tambah-ujian-berproteksi' => 'actions/tambah_quiz.php',
    'tambah_quiz' => 'actions/tambah_quiz.php',
    'tambah_ujian' => 'actions/tambah_quiz.php',
    'actions/rename-quiz-subject' => 'actions/rename_quiz_subject.php',
    'actions/rename-ujian-subject' => 'actions/rename_quiz_subject.php',
    'actions/rename-ujian-berproteksi' => 'actions/rename_quiz_subject.php',
    'rename_quiz_subject' => 'actions/rename_quiz_subject.php',
    'rename_ujian_subject' => 'actions/rename_quiz_subject.php',
    'actions/update-quiz' => 'actions/update_quiz.php',
    'actions/update-ujian' => 'actions/update_quiz.php',
    'actions/update-ujian-berproteksi' => 'actions/update_quiz.php',
    'update_quiz' => 'actions/update_quiz.php',
    'update_ujian' => 'actions/update_quiz.php',
    'actions/tambah-ulasan' => 'actions/tambah_ulasan.php',
    'tambah_ulasan' => 'actions/tambah_ulasan.php',
    'actions/update-profil' => 'actions/update_profil.php',
    'update_profil' => 'actions/update_profil.php',
    'actions/update-ebook' => 'actions/update_ebook.php',
    'update_ebook' => 'actions/update_ebook.php',
    'actions/ganti-password' => 'actions/ganti_password.php',
    'ganti_password' => 'actions/ganti_password.php',
    'actions/nilai-pengumpulan-tugas' => 'actions/nilai_pengumpulan_tugas.php',
    'nilai_pengumpulan_tugas' => 'actions/nilai_pengumpulan_tugas.php',

    // Uploads
    'uploads/dokumentasi' => 'uploads/upload_dokumentasi.php',
    'upload_dokumentasi' => 'uploads/upload_dokumentasi.php',
    'uploads/ebook' => 'uploads/upload_ebook.php',
    'upload_ebook' => 'uploads/upload_ebook.php',
    'uploads/foto' => 'uploads/upload_foto.php',
    'upload_foto' => 'uploads/upload_foto.php',
    'uploads/tugas' => 'uploads/upload_tugas.php',
    'upload_tugas' => 'uploads/upload_tugas.php',
    'uploads/pengumpulan-tugas' => 'uploads/upload_pengumpulan_tugas.php',
    'upload_pengumpulan_tugas' => 'uploads/upload_pengumpulan_tugas.php',
    'uploads/donasi' => 'uploads/upload_donasi.php',
    'upload_donasi' => 'uploads/upload_donasi.php',

    // Admin data
    'data/admin-tokens' => 'data/get_admin_tokens.php',
    'get_admin_tokens' => 'data/get_admin_tokens.php',
    'data/admin-users' => 'data/get_admin_users.php',
    'get_admin_users' => 'data/get_admin_users.php',
    'data/admin-activity' => 'data/get_admin_activity.php',
    'get_admin_activity' => 'data/get_admin_activity.php',
    'data/admin-content' => 'data/get_admin_content.php',
    'get_admin_content' => 'data/get_admin_content.php',
    'data/admin-absensi' => 'data/get_admin_absensi.php',
    'get_admin_absensi' => 'data/get_admin_absensi.php',
    'data/admin-laporan' => 'data/get_admin_laporan.php',
    'get_admin_laporan' => 'data/get_admin_laporan.php',

    // Admin actions
    'actions/generate-token' => 'actions/generate_token.php',
    'generate_token' => 'actions/generate_token.php',
    'actions/revoke-token' => 'actions/revoke_token.php',
    'revoke_token' => 'actions/revoke_token.php',
    'actions/admin-create-user' => 'actions/admin_create_user.php',
    'admin_create_user' => 'actions/admin_create_user.php',
    'actions/admin-update-user' => 'actions/admin_update_user.php',
    'admin_update_user' => 'actions/admin_update_user.php',
    'actions/admin-reset-password' => 'actions/admin_reset_password.php',
    'admin_reset_password' => 'actions/admin_reset_password.php',

    // Deletes
    'deletes/user-admin' => 'deletes/hapus_user_admin.php',
    'hapus_user_admin' => 'deletes/hapus_user_admin.php',
    'deletes/konten-admin' => 'deletes/hapus_konten_admin.php',
    'hapus_konten_admin' => 'deletes/hapus_konten_admin.php',
    'deletes/dokumentasi' => 'deletes/hapus_dokumentasi.php',
    'hapus_dokumentasi' => 'deletes/hapus_dokumentasi.php',
    'deletes/ebook' => 'deletes/hapus_ebook.php',
    'hapus_ebook' => 'deletes/hapus_ebook.php',
    'deletes/murid' => 'deletes/hapus_murid.php',
    'hapus_murid' => 'deletes/hapus_murid.php',
    'deletes/quiz' => 'deletes/hapus_quiz.php',
    'deletes/ujian' => 'deletes/hapus_quiz.php',
    'deletes/ujian-berproteksi' => 'deletes/hapus_quiz.php',
    'hapus_quiz' => 'deletes/hapus_quiz.php',
    'hapus_ujian' => 'deletes/hapus_quiz.php',
    'deletes/tugas' => 'deletes/hapus_tugas.php',
    'hapus_tugas' => 'deletes/hapus_tugas.php',
];

// Allow direct implementation-style URLs (for example
// /backend/data/get_ebooks.php) only when their target is already present in
// the approved route map above. This keeps compatibility without opening a
// generic file include surface.
foreach (array_values($routes) as $target) {
    $alias = substr($target, 0, -4);
    if (!isset($routes[$alias])) {
        $routes[$alias] = $target;
    }
}

if (!isset($routes[$route])) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Route backend tidak ditemukan',
        'route' => $route,
    ]);
    exit;
}

require __DIR__ . '/' . $routes[$route];
?>
