<?php
/**
 * CSRF Protection Helper
 * 
 * Usage:
 * - In forms: <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
 * - In endpoints: csrf_verify() or die
 */

function csrf_token() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_verify() {
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    
    if ($token === '' || $sessionToken === '' || !hash_equals($sessionToken, $token)) {
        http_response_code(403);
        die('CSRF token validation failed');
    }
    
    return true;
}

function csrf_field() {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}
?>
