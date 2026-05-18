<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id']) || ($_SESSION['user_role'] ?? '') !== 'admin') {
    echo json_encode([
        "status"  => "error",
        "message" => "Admin access required"
    ]);
    exit;
}

$userId = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
$newRole = isset($_POST['role']) ? trim($_POST['role']) : '';

$allowedRoles = ['user', 'employee', 'admin'];

if ($userId <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid user id"]);
    exit;
}

if (!in_array($newRole, $allowedRoles, true)) {
    echo json_encode(["status" => "error", "message" => "Invalid role"]);
    exit;
}

if ($userId === intval($_SESSION['user_id']) && $newRole !== 'admin') {
    echo json_encode([
        "status"  => "error",
        "message" => "You cannot demote your own admin account"
    ]);
    exit;
}

$checkRole = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'role'");
if ($checkRole && mysqli_num_rows($checkRole) === 0) {
    mysqli_query($conn, "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
}

$stmt = mysqli_prepare($conn, "UPDATE users SET role = ? WHERE id = ?");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    exit;
}

mysqli_stmt_bind_param($stmt, "si", $newRole, $userId);
$ok = mysqli_stmt_execute($stmt);

if (!$ok) {
    echo json_encode([
        "status"  => "error",
        "message" => mysqli_stmt_error($stmt)
    ]);
    exit;
}

echo json_encode([
    "status"  => "success",
    "message" => "Role updated",
    "user_id" => $userId,
    "role"    => $newRole
]);
?>
