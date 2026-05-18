<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";
require_once "./_stats.php";

ensureStatsSchema($conn);

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$user_id = intval($_SESSION['user_id']);

/*
  Ensure profile columns exist.
*/
$columns = [
    "first_name"    => "VARCHAR(100) DEFAULT NULL",
    "middle_name"   => "VARCHAR(100) DEFAULT NULL",
    "last_name"     => "VARCHAR(100) DEFAULT NULL",
    "age"           => "INT(11) DEFAULT NULL",
    "birth_date"    => "DATE DEFAULT NULL",
    "phone"         => "VARCHAR(50) DEFAULT NULL",
    "city"          => "VARCHAR(100) DEFAULT NULL",
    "bio"           => "TEXT DEFAULT NULL",
    "profile_image" => "LONGTEXT DEFAULT NULL"
];

foreach ($columns as $col => $definition) {
    $safeCol = mysqli_real_escape_string($conn, $col);
    $check = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE '$safeCol'");
    if ($check && mysqli_num_rows($check) === 0) {
        mysqli_query($conn, "ALTER TABLE users ADD COLUMN $safeCol $definition");
    }
}

$first_name  = trim($_POST['first_name'] ?? '');
$middle_name = trim($_POST['middle_name'] ?? '');
$last_name   = trim($_POST['last_name'] ?? '');

$age = null;
if (isset($_POST['age']) && trim($_POST['age']) !== '') {
    $age = intval($_POST['age']);
}

$birth_date = null;
if (isset($_POST['birth_date']) && trim($_POST['birth_date']) !== '') {
    $birth_date = trim($_POST['birth_date']);
}

$phone = trim($_POST['phone'] ?? '');
$city  = trim($_POST['city'] ?? '');
$bio   = trim($_POST['bio'] ?? '');

$profile_image = null;
if (isset($_POST['profile_image']) && $_POST['profile_image'] !== '') {
    $profile_image = $_POST['profile_image'];
}

if ($profile_image !== null) {
    // Limit stored Base64 image size to about 700KB
    if (strlen($profile_image) > 700 * 1024) {
        echo json_encode([
            "status" => "error",
            "message" => "Profile image is too large after compression"
        ]);
        exit;
    }

    if (strpos($profile_image, 'data:image/') !== 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid profile image format"
        ]);
        exit;
    }
}
$full_name = trim(implode(' ', array_filter([
    $first_name,
    $middle_name,
    $last_name
])));

if ($full_name === '') {
    $full_name = 'User';
}

/*
  If no new image is sent, keep existing profile_image.
*/
if ($profile_image === null) {
    $sql = "UPDATE users
            SET name = ?,
                first_name = ?,
                middle_name = ?,
                last_name = ?,
                age = ?,
                birth_date = ?,
                phone = ?,
                city = ?,
                bio = ?
            WHERE id = ?";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode([
            "status" => "error",
            "message" => $conn->error
        ]);
        exit;
    }

    $stmt->bind_param(
        "ssssissssi",
        $full_name,
        $first_name,
        $middle_name,
        $last_name,
        $age,
        $birth_date,
        $phone,
        $city,
        $bio,
        $user_id
    );
} else {
    $sql = "UPDATE users
            SET name = ?,
                first_name = ?,
                middle_name = ?,
                last_name = ?,
                age = ?,
                birth_date = ?,
                phone = ?,
                city = ?,
                bio = ?,
                profile_image = ?
            WHERE id = ?";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode([
            "status" => "error",
            "message" => $conn->error
        ]);
        exit;
    }

    $stmt->bind_param(
        "ssssisssssi",
        $full_name,
        $first_name,
        $middle_name,
        $last_name,
        $age,
        $birth_date,
        $phone,
        $city,
        $bio,
        $profile_image,
        $user_id
    );
}

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "profile updated"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>