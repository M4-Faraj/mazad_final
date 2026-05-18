<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

header("Content-Type: application/json");
require_once "../config/db.php";

function login_redirect_for_role($role) {
    if ($role === 'admin') return 'Admin.html';
    if ($role === 'employee') return 'Employee.html';
    return 'index.html';
}

function login_error_response() {
    echo json_encode(["status" => "error", "message" => "Email or password incorrect"]);
    exit;
}

if (!isset($_POST['email']) || !isset($_POST['password'])) {
    login_error_response();
}

$email    = trim($_POST['email']);
$password = $_POST['password'];

$stmt = mysqli_prepare($conn, "SELECT * FROM users WHERE email = ? LIMIT 1");
if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Login unavailable"]);
    exit;
}

mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) > 0) {
    $user = mysqli_fetch_assoc($result);

    $stored = (string)($user['password'] ?? '');
    // Support both bcrypt hashes and legacy plain-text passwords
    $ok = (strlen($stored) >= 60 && $stored[0] === '$')
        ? password_verify($password, $stored)
        : ($password === $stored);

    if ($ok) {
        // Upgrade plain-text to bcrypt on first successful login
        if ($stored === '' || $stored[0] !== '$') {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $update = mysqli_prepare($conn, "UPDATE users SET password = ? WHERE id = ?");
            if ($update) {
                $userId = (int)$user['id'];
                mysqli_stmt_bind_param($update, "si", $hash, $userId);
                mysqli_stmt_execute($update);
            }
        }

        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role']  = $user['role'];

        echo json_encode([
            "status" => "success",
            "role" => $user['role'],
            "redirect" => login_redirect_for_role($user['role']),
            "user"   => [
                "id"    => $user['id'],
                "name"  => $user['name'],
                "email" => $user['email'],
                "role"  => $user['role']
            ]
        ]);
    } else {
        login_error_response();
    }
} else {
    login_error_response();
}
?>
