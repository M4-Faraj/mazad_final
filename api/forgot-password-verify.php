<?php
header("Content-Type: application/json");
require_once "../config/db.php";

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$code  = isset($_POST['code']) ? trim($_POST['code']) : '';

if ($email === '' || !preg_match('/^\d{6}$/', $code)) {
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$stmt = mysqli_prepare(
    $conn,
    "SELECT id, code_hash, attempts, expires_at FROM password_resets
     WHERE email=? AND verified=0
     ORDER BY id DESC LIMIT 1"
);
mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$row) {
    echo json_encode(["status" => "error", "message" => "No active code. Please request a new one."]);
    exit;
}

if (strtotime($row['expires_at']) < time()) {
    echo json_encode(["status" => "error", "message" => "Code expired. Please resend."]);
    exit;
}

if ((int)$row['attempts'] >= 5) {
    echo json_encode(["status" => "error", "message" => "Too many attempts. Please request a new code."]);
    exit;
}

if (!password_verify($code, $row['code_hash'])) {
    $stmtU = mysqli_prepare($conn, "UPDATE password_resets SET attempts=attempts+1 WHERE id=?");
    mysqli_stmt_bind_param($stmtU, "i", $row['id']);
    mysqli_stmt_execute($stmtU);
    mysqli_stmt_close($stmtU);
    echo json_encode(["status" => "error", "message" => "Incorrect code"]);
    exit;
}

// Mark verified, issue a one-time reset token.
$resetToken = bin2hex(random_bytes(24));
$stmtV = mysqli_prepare(
    $conn,
    "UPDATE password_resets SET verified=1, reset_token=?, expires_at=? WHERE id=?"
);
$newExpiry = date('Y-m-d H:i:s', time() + 10 * 60); // 10 more minutes to set new password
mysqli_stmt_bind_param($stmtV, "ssi", $resetToken, $newExpiry, $row['id']);
mysqli_stmt_execute($stmtV);
mysqli_stmt_close($stmtV);

echo json_encode(["status" => "success", "reset_token" => $resetToken]);
