<?php
/**
 * Input Validation Helper
 */

function validate_required($value, $fieldName) {
    if (empty(trim($value))) {
        return "$fieldName wajib diisi";
    }
    return null;
}

function validate_length($value, $fieldName, $min = null, $max = null) {
    $length = mb_strlen($value);
    
    if ($min !== null && $length < $min) {
        return "$fieldName minimal $min karakter";
    }
    
    if ($max !== null && $length > $max) {
        return "$fieldName maksimal $max karakter";
    }
    
    return null;
}

function validate_range($value, $fieldName, $min, $max) {
    $num = (int) $value;
    
    if ($num < $min || $num > $max) {
        return "$fieldName harus antara $min dan $max";
    }
    
    return null;
}

function validate_enum($value, $fieldName, array $allowedValues) {
    if (!in_array($value, $allowedValues, true)) {
        return "$fieldName tidak valid";
    }
    
    return null;
}

function validate_date($value, $fieldName) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return "$fieldName format tidak valid (YYYY-MM-DD)";
    }
    
    $parts = explode('-', $value);
    if (!checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])) {
        return "$fieldName tanggal tidak valid";
    }
    
    return null;
}

function validate_file_extension($filename, $fieldName, array $allowedExtensions) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    if (!in_array($ext, $allowedExtensions, true)) {
        $allowed = implode(', ', $allowedExtensions);
        return "$fieldName harus berformat: $allowed";
    }
    
    return null;
}

function validate_file_size($fileSize, $fieldName, $maxSizeBytes) {
    if ($fileSize > $maxSizeBytes) {
        $maxMB = round($maxSizeBytes / 1024 / 1024, 1);
        return "$fieldName maksimal $maxMB MB";
    }
    
    return null;
}

function validate_mime_type($filePath, $fieldName, array $allowedMimeTypes) {
    if (!file_exists($filePath)) {
        return "$fieldName file tidak ditemukan";
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $filePath);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedMimeTypes, true)) {
        return "$fieldName tipe file tidak didukung";
    }
    
    return null;
}

function collect_errors(array $validations) {
    $errors = array_filter($validations);
    return empty($errors) ? null : $errors;
}

function redirect_with_error($url, $errors) {
    $errorMessage = is_array($errors) ? implode('. ', $errors) : $errors;
    header('Location: ' . $url . '&error=' . urlencode($errorMessage));
    exit;
}

function json_error($message, $code = 400) {
    http_response_code($code);
    die(json_encode(['success' => false, 'error' => $message]));
}
?>
