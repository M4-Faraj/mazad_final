<?php
header("Content-Type: application/json");
require_once "../config/db.php";

$email       = isset($_POST['email']) ? trim($_POST['email']) : '';
$resetToken  = isset($_POST['reset_token']) ? trim($_POST['reset_token']) : '';
$newPassword = isset($_POST['new_password']) ? (string)$_POST['new_password'] : '';

if ($email === '' || $resetToken === '' || strlen($newPassword) < 8) {
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$stmt = mysqli_prepare(
    $conn,
    "SELECT id, expires_at FROM password_resets
     WHERE email=? AND reset_token=? AND verified=1
     ORDER BY id DESC LIMIT 1"
);
mysqli_stmt_bind_param($stmt, "ss", $email, $resetToken);
mysqli_stmt_execute($stmt);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$row) {
    echo json_encode(["status" => "error", "message" => "Invalid or expired reset token"]);
    exit;
}

if (strtotime($row['expires_at']) < time()) {
    echo json_encode(["status" => "error", "message" => "Reset window expired. Please restart the process."]);
    exit;
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);

$stmtU = mysqli_prepare($conn, "UPDATE users SET password=? WHERE email=?");
mysqli_stmt_bind_param($stmtU, "ss", $hash, $email);
mysqli_stmt_execute($stmtU);
$affected = mysqli_stmt_affected_rows($stmtU);
mysqli_stmt_close($stmtU);

if ($affected < 1) {
    echo json_encode(["status" => "error", "message" => "Could not update password"]);
    exit;
}

// Burn the reset row so it can't be reused.
$stmtD = mysqli_prepare($conn, "DELETE FROM password_resets WHERE email=?");
mysqli_stmt_bind_param($stmtD, "s", $email);
mysqli_stmt_execute($stmtD);
mysqli_stmt_close($stmtD);

echo json_encode(["status" => "success", "message" => "Password updated"]);
