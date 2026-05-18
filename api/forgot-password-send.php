<?php
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "./_mailer.php";

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Invalid email"]);
    exit;
}

// Look up user (we still return generic success below if not found to avoid leaking accounts,
// but we skip sending the email in that case).
$stmt = mysqli_prepare($conn, "SELECT id, name FROM users WHERE email=? LIMIT 1");
if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Password recovery is unavailable"]);
    exit;
}
mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($res);
mysqli_stmt_close($stmt);

if (!$user) {
    // Generic success — don't reveal which emails exist.
    echo json_encode(["status" => "success", "message" => "If the email exists, a code was sent."]);
    exit;
}

// Invalidate previous unused codes for this email.
$stmtDel = mysqli_prepare($conn, "DELETE FROM password_resets WHERE email=? AND verified=0");
if (!$stmtDel) {
    echo json_encode(["status" => "error", "message" => "Password reset table is not ready"]);
    exit;
}
mysqli_stmt_bind_param($stmtDel, "s", $email);
mysqli_stmt_execute($stmtDel);
mysqli_stmt_close($stmtDel);

// 6-digit numeric code.
$code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$codeHash = password_hash($code, PASSWORD_DEFAULT);
$expires = date('Y-m-d H:i:s', time() + 10 * 60); // 10 minutes

$stmtIns = mysqli_prepare(
    $conn,
    "INSERT INTO password_resets (email, code_hash, expires_at) VALUES (?, ?, ?)"
);
if (!$stmtIns) {
    echo json_encode(["status" => "error", "message" => "Password reset table is not ready"]);
    exit;
}
mysqli_stmt_bind_param($stmtIns, "sss", $email, $codeHash, $expires);
mysqli_stmt_execute($stmtIns);
mysqli_stmt_close($stmtIns);

// Send the email.
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/mazad/api/forgot-password-send.php'))), '/');
$resetUrl = $scheme . '://' . $host . $basePath . '/forgot-password.html';

$html = mazad_password_reset_email_html($code, $resetUrl, '10 minutes');
$text = "MAZAD password reset code: $code\n"
    . "It expires in 10 minutes.\n"
    . "Open password recovery: $resetUrl\n"
    . "If you did not request this, ignore this email.";

[$ok, $log] = mazad_send_mail($email, $user['name'] ?? '', 'MAZAD password reset code', $html, $text);

if (!$ok) {
    // For local debugging on XAMPP, surface the SMTP error.
    echo json_encode([
        "status"  => "error",
        "message" => "Failed to send email",
        "debug"   => $log
    ]);
    exit;
}

echo json_encode(["status" => "success", "message" => "Code sent"]);
