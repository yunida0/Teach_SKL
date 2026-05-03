<?php
session_start();
session_destroy();
header('Location: ../index.php?success=' . urlencode('Anda telah logout'));
exit;
?>
