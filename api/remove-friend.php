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
$friend_id = intval($_POST['friend_id'] ?? 0);

if ($friend_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing friend_id"
    ]);
    exit;
}

$stmt = $conn->prepare("
    DELETE FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (sender_id = ? AND receiver_id = ?)
        OR
        (sender_id = ? AND receiver_id = ?)
      )
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("iiii", $user_id, $friend_id, $friend_id, $user_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode([
        "status" => "success",
        "message" => "Friend removed"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Friendship not found"
    ]);
}
?>