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
$friend_id = intval($_GET['friend_id'] ?? 0);

if ($friend_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing friend_id"
    ]);
    exit;
}

/*
  Only accepted friends can view each other's friend report.
*/
$check = $conn->prepare("
    SELECT id
    FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (sender_id = ? AND receiver_id = ?)
        OR
        (sender_id = ? AND receiver_id = ?)
      )
    LIMIT 1
");

if (!$check) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$check->bind_param("iiii", $current_user_id, $friend_id, $friend_id, $current_user_id);
$check->execute();
$friendship = $check->get_result()->fetch_assoc();

if (!$friendship) {
    echo json_encode([
        "status" => "error",
        "message" => "You can only view accepted friends"
    ]);
    exit;
}

$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        u.last_seen,
        u.profile_image,
        COALESCE(u.tokens, 0) AS tokens,
        COALESCE(u.rank_title, 'Bronze') AS rank_title,

        COUNT(DISTINCT a.id) AS auctions_count,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) AS approved_auctions_count,
        COUNT(DISTINCT b.id) AS bids_count,

        CASE
            WHEN u.last_seen IS NOT NULL
             AND u.last_seen >= (NOW() - INTERVAL 5 MINUTE)
            THEN 'online'
            ELSE 'offline'
        END AS online_status

    FROM users u
    LEFT JOIN auctions a ON a.user_id = u.id
    LEFT JOIN bids b ON b.user_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
    LIMIT 1
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $friend_id);
$stmt->execute();

$result = $stmt->get_result();
$row = $result->fetch_assoc();

if (!$row) {
    echo json_encode([
        "status" => "error",
        "message" => "Friend not found"
    ]);
    exit;
}

echo json_encode([
    "status" => "success",
    "friend" => [
        "id" => intval($row["id"]),
        "name" => $row["name"],
        "email" => $row["email"],
        "role" => $row["role"],
        "created_at" => $row["created_at"],
        "last_seen" => $row["last_seen"],
        "profile_image" => $row["profile_image"],
        "tokens" => intval($row["tokens"]),
        "rank_title" => $row["rank_title"],
        "auctions_count" => intval($row["auctions_count"]),
        "approved_auctions_count" => intval($row["approved_auctions_count"]),
        "bids_count" => intval($row["bids_count"]),
        "online_status" => $row["online_status"]
    ]
]);
?>