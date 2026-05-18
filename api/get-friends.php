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

$user_id = intval($_SESSION['user_id']);

$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.profile_image,
        u.last_seen,
        fr.created_at,
        CASE
            WHEN u.last_seen IS NOT NULL
             AND u.last_seen >= (NOW() - INTERVAL 5 MINUTE)
            THEN 'online'
            ELSE 'offline'
        END AS online_status
    FROM friend_requests fr
    JOIN users u
      ON u.id = CASE
        WHEN fr.sender_id = ? THEN fr.receiver_id
        ELSE fr.sender_id
      END
    WHERE (fr.sender_id = ? OR fr.receiver_id = ?)
      AND fr.status = 'accepted'
    ORDER BY u.name ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $user_id, $user_id, $user_id);
$stmt->execute();

$result = $stmt->get_result();

$friends = [];

while ($row = $result->fetch_assoc()) {
    $friends[] = [
        "id" => intval($row["id"]),
        "name" => $row["name"],
        "email" => $row["email"],
        "profile_image" => $row["profile_image"],
        "online_status" => $row["online_status"],
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $friends
]);
?>