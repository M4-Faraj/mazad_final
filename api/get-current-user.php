<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";
require_once "./_stats.php";

ensureStatsSchema($conn);

/*
  Ensure last_seen column exists.
  This is used by Admin Users Management to show Online / Offline users.
*/
$checkLastSeen = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'last_seen'");
if ($checkLastSeen && mysqli_num_rows($checkLastSeen) === 0) {
    mysqli_query($conn, "ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT NULL");
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$user_id = intval($_SESSION['user_id']);

/*
  Update user activity timestamp.
  User is considered online if last_seen is within the last 5 minutes.
*/
$updateSeen = $conn->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?");
if ($updateSeen) {
    $updateSeen->bind_param("i", $user_id);
    $updateSeen->execute();
}

$sql = "SELECT id, name, email, role, created_at, last_seen, profile_image,
           COALESCE(tokens, 0) AS tokens,
           COALESCE(purchases_count, 0) AS purchases_count,
           COALESCE(sales_count, 0) AS sales_count,
           COALESCE(rank_score, 0) AS rank_score,
           COALESCE(rank_title, 'Bronze') AS rank_title
    FROM users
    WHERE id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();
$user = $result->fetch_assoc();

if ($user) {
    /*
      Server-authoritative streaming permission for the live auction room.
      Only admins and employees may broadcast a camera on live-auction.html.
    */
    $user['can_stream'] = in_array(strtolower((string)$user['role']), ['admin', 'employee'], true);
}

echo json_encode([
    "status" => "success",
    "user" => $user
]);
?>
