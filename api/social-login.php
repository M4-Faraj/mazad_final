<?php
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once "../config/db.php";

$GOOGLE_CLIENT_ID = "PUT_GOOGLE_CLIENT_ID_HERE";
$FACEBOOK_APP_ID  = "PUT_FACEBOOK_APP_ID_HERE";

$provider = isset($_POST['provider']) ? trim($_POST['provider']) : '';

function respond($data) {
    echo json_encode($data);
    exit;
}

function splitName($name) {
    $parts = preg_split('/\s+/', trim($name));
    $first = isset($parts[0]) ? $parts[0] : '';
    $last = count($parts) > 1 ? $parts[count($parts) - 1] : '';
    $middle = '';

    if (count($parts) > 2) {
        $middleParts = array_slice($parts, 1, -1);
        $middle = implode(' ', $middleParts);
    }

    return [$first, $middle, $last];
}

function loginOrCreateUser($conn, $name, $email) {
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond([
            "status" => "error",
            "message" => "Social account email is missing or invalid"
        ]);
    }

    $check = $conn->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $check->bind_param("s", $email);
    $check->execute();
    $result = $check->get_result();

    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();

        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role']  = $user['role'];

        respond([
            "status" => "success",
            "user" => [
                "id"    => $user['id'],
                "name"  => $user['name'],
                "email" => $user['email'],
                "role"  => $user['role']
            ]
        ]);
    }

    list($first_name, $middle_name, $last_name) = splitName($name);

    $randomPassword = bin2hex(random_bytes(16));
    $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);

    $birthdate = null;
    $age = null;
    $gender = '';
    $phone = '';
    $role = 'user';

    $stmt = $conn->prepare("
        INSERT INTO users
        (name, first_name, middle_name, last_name, email, password, birth_date, age, gender, phone, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->bind_param(
        "sssssssisss",
        $name,
        $first_name,
        $middle_name,
        $last_name,
        $email,
        $hashedPassword,
        $birthdate,
        $age,
        $gender,
        $phone,
        $role
    );

    if (!$stmt->execute()) {
        respond([
            "status" => "error",
            "message" => $stmt->error
        ]);
    }

    $user_id = $stmt->insert_id;

    $_SESSION['user_id']    = $user_id;
    $_SESSION['user_name']  = $name;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_role']  = $role;

    respond([
        "status" => "success",
        "user" => [
            "id"    => $user_id,
            "name"  => $name,
            "email" => $email,
            "role"  => $role
        ]
    ]);
}

if ($provider === "google") {
    $credential = isset($_POST['credential']) ? $_POST['credential'] : '';

    if ($credential === '') {
        respond(["status" => "error", "message" => "Missing Google credential"]);
    }

    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);
    $response = @file_get_contents($url);

    if ($response === false) {
        respond(["status" => "error", "message" => "Could not verify Google token"]);
    }

    $payload = json_decode($response, true);

    if (!$payload || !isset($payload['aud']) || $payload['aud'] !== $GOOGLE_CLIENT_ID) {
        respond(["status" => "error", "message" => "Invalid Google token"]);
    }

    if (isset($payload['exp']) && time() > intval($payload['exp'])) {
        respond(["status" => "error", "message" => "Google token expired"]);
    }

    $email = isset($payload['email']) ? $payload['email'] : '';
    $name  = isset($payload['name']) ? $payload['name'] : $email;

    loginOrCreateUser($conn, $name, $email);
}

if ($provider === "facebook") {
    $accessToken = isset($_POST['access_token']) ? $_POST['access_token'] : '';

    if ($accessToken === '') {
        respond(["status" => "error", "message" => "Missing Facebook access token"]);
    }

    $url = "https://graph.facebook.com/me?fields=id,name,email,picture&access_token=" . urlencode($accessToken);
    $response = @file_get_contents($url);

    if ($response === false) {
        respond(["status" => "error", "message" => "Could not verify Facebook login"]);
    }

    $profile = json_decode($response, true);

    if (!$profile || !isset($profile['id'])) {
        respond(["status" => "error", "message" => "Invalid Facebook response"]);
    }

    if (!isset($profile['email']) || $profile['email'] === '') {
        respond([
            "status" => "error",
            "message" => "Facebook account did not provide an email"
        ]);
    }

    $email = $profile['email'];
    $name  = isset($profile['name']) ? $profile['name'] : $email;

    loginOrCreateUser($conn, $name, $email);
}

respond(["status" => "error", "message" => "Invalid provider"]);
?>