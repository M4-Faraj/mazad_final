<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "not logged in"]);
    exit;
}

$current = $_POST['current_password'] ?? '';
$newPass  = $_POST['new_password']     ?? '';
$confirm  = $_POST['confirm_password'] ?? '';

if (!$current || !$newPass || !$confirm) {
    echo json_encode(["status" => "error", "message" => "All fields required"]);
    exit;
}

if ($newPass !== $confirm) {
    echo json_encode(["status" => "error", "message" => "New passwords do not match"]);
    exit;
}

if (strlen($newPass) < 6) {
    echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters"]);
    exit;
}

$user_id = intval($_SESSION['user_id']);
$stmt    = $conn->prepare("SELECT password FROM users WHERE id=? LIMIT 1");
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res  = $stmt->get_result();
$user = $res->fetch_assoc();

if (!$user) {
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

$stored = $user['password'];
$ok     = (strlen($stored) >= 60 && $stored[0] === '$')
    ? password_verify($current, $stored)
    : ($current === $stored);

if (!$ok) {
    echo json_encode(["status" => "error", "message" => "Current password is wrong"]);
    exit;
}

$hash   = password_hash($newPass, PASSWORD_DEFAULT);
$update = $conn->prepare("UPDATE users SET password=? WHERE id=?");
$update->bind_param('si', $hash, $user_id);
if ($update->execute()) {
    echo json_encode(["status" => "success", "message" => "Password updated"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
?>
