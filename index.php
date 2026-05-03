<?php
$frontendUrl = getenv('FRONTEND_URL') ?: 'http://localhost:3000';
$query = $_SERVER['QUERY_STRING'] ?? '';
$target = rtrim($frontendUrl, '/') . ($query !== '' ? '/?' . $query : '/');

header('Location: ' . $target, true, 302);
exit;
?>
