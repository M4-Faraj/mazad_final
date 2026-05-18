<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$current_user_id = intval($_SESSION['user_id']);
$q = trim($_GET['q'] ?? '');

if ($q === '' || mb_strlen($q) < 2) {
    echo json_encode([
        "status" => "success",
        "data" => []
    ]);
    exit;
}

$like = "%" . $q . "%";

$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.profile_image,
        u.last_seen,
        CASE
            WHEN u.last_seen IS NOT NULL
             AND u.last_seen >= (NOW() - INTERVAL 5 MINUTE)
            THEN 'online'
            ELSE 'offline'
        END AS online_status,

        fr.id AS request_id,
        fr.status AS friendship_status,
        fr.sender_id,
        fr.receiver_id

    FROM users u

    LEFT JOIN friend_requests fr
      ON (
        (fr.sender_id = ? AND fr.receiver_id = u.id)
        OR
        (fr.sender_id = u.id AND fr.receiver_id = ?)
      )

    WHERE u.id <> ?
      AND (
        u.name LIKE ?
        OR u.email LIKE ?
      )

    ORDER BY
      CASE WHEN online_status = 'online' THEN 0 ELSE 1 END,
      u.name ASC

    LIMIT 10
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param(
    "iiiss",
    $current_user_id,
    $current_user_id,
    $current_user_id,
    $like,
    $like
);

$stmt->execute();
$result = $stmt->get_result();

$users = [];

while ($row = $result->fetch_assoc()) {
    $users[] = [
        "id" => intval($row["id"]),
        "name" => $row["name"],
        "email" => $row["email"],
        "profile_image" => $row["profile_image"],
        "online_status" => $row["online_status"],
        "request_id" => $row["request_id"] ? intval($row["request_id"]) : null,
        "friendship_status" => $row["friendship_status"],
        "sender_id" => $row["sender_id"] ? intval($row["sender_id"]) : null,
        "receiver_id" => $row["receiver_id"] ? intval($row["receiver_id"]) : null
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $users
]);
?>