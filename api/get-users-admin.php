<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not authorized"
    ]);
    exit;
}

$role = $_SESSION['user_role'];

if ($role !== "admin" && $role !== "employee") {
    echo json_encode([
        "status" => "error",
        "message" => "insufficient privileges"
    ]);
    exit;
}

/*
  Ensure last_seen exists for older databases.
*/
$checkLastSeen = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'last_seen'");
if ($checkLastSeen && mysqli_num_rows($checkLastSeen) === 0) {
    mysqli_query($conn, "ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT NULL");
}

$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        u.last_seen,
        COALESCE(u.tokens, 0) AS tokens,
        COALESCE(u.rank_title, 'Bronze') AS rank_title,
        COUNT(DISTINCT a.id) AS auctions_count,
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
    GROUP BY u.id
    ORDER BY u.created_at DESC
";

$res = mysqli_query($conn, $sql);

if (!$res) {
    echo json_encode([
        "status" => "error",
        "message" => mysqli_error($conn)
    ]);
    exit;
}

$users = [];

while ($row = mysqli_fetch_assoc($res)) {
    $users[] = [
        "id" => intval($row["id"]),
        "name" => $row["name"],
        "email" => $row["email"],
        "role" => $row["role"],
        "created_at" => $row["created_at"],
        "last_seen" => $row["last_seen"],
        "tokens" => intval($row["tokens"]),
        "rank_title" => $row["rank_title"],
        "auctions_count" => intval($row["auctions_count"]),
        "bids_count" => intval($row["bids_count"]),
        "online_status" => $row["online_status"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $users
]);
?>