<?php
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once "../config/db.php";
require_once "./_stats.php";

ensureStatsSchema($conn);

$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$first_name = isset($_POST['first_name']) ? trim($_POST['first_name']) : '';
$middle_name = isset($_POST['middle_name']) ? trim($_POST['middle_name']) : '';
$last_name = isset($_POST['last_name']) ? trim($_POST['last_name']) : '';
$phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$birthdate = isset($_POST['birthdate']) && $_POST['birthdate'] !== '' ? trim($_POST['birthdate']) : null;
$gender = isset($_POST['gender']) ? trim($_POST['gender']) : '';

if ($name === '' || $email === '' || $password === '') {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Invalid email"]);
    exit;
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

$age = null;
if ($birthdate) {
    $ts = strtotime($birthdate);
    if ($ts !== false) {
        $today = new DateTime();
        $dob = new DateTime($birthdate);
        $age = $today->diff($dob)->y;
    }
}

$check = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$check->bind_param('s', $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Email already exists"]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO users 
    (name, first_name, middle_name, last_name, email, password, birth_date, age, gender, phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
");

$ag = is_null($age) ? null : $age;

$stmt->bind_param(
    'sssssssiss',
    $name,
    $first_name,
    $middle_name,
    $last_name,
    $email,
    $hashed_password,
    $birthdate,
    $ag,
    $gender,
    $phone
);

if ($stmt->execute()) {
    $user_id = $stmt->insert_id;

    $_SESSION['user_id'] = $user_id;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_role'] = "user";

    echo json_encode([
        "status" => "success",
        "user" => [
            "id" => $user_id,
            "name" => $name,
            "first_name" => $first_name,
            "middle_name" => $middle_name,
            "last_name" => $last_name,
            "email" => $email,
            "age" => $ag,
            "birth_date" => $birthdate,
            "gender" => $gender,
            "phone" => $phone,
            "role" => "user"
        ]
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>