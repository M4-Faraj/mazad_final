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
$friend_id = intval($_GET['friend_id'] ?? 0);

if ($friend_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing friend_id"
    ]);
    exit;
}

/*
  Only accepted friends can load chat.
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

$check->bind_param("iiii", $user_id, $friend_id, $friend_id, $user_id);
$check->execute();
$friendship = $check->get_result()->fetch_assoc();

if (!$friendship) {
    echo json_encode([
        "status" => "error",
        "message" => "You can only chat with accepted friends"
    ]);
    exit;
}

/*
  Mark messages from friend as read.
*/
$mark = $conn->prepare("
    UPDATE chat_messages
    SET is_read = 1
    WHERE sender_id = ?
      AND receiver_id = ?
");
if ($mark) {
    $mark->bind_param("ii", $friend_id, $user_id);
    $mark->execute();
}

$sql = "
    SELECT
        id,
        sender_id,
        receiver_id,
        message,
        is_read,
        created_at
    FROM chat_messages
    WHERE
      (sender_id = ? AND receiver_id = ?)
      OR
      (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
    LIMIT 200
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("iiii", $user_id, $friend_id, $friend_id, $user_id);
$stmt->execute();

$result = $stmt->get_result();

$messages = [];

while ($row = $result->fetch_assoc()) {
    $messages[] = [
        "id" => intval($row["id"]),
        "sender_id" => intval($row["sender_id"]),
        "receiver_id" => intval($row["receiver_id"]),
        "message" => $row["message"],
        "is_read" => intval($row["is_read"]),
        "created_at" => $row["created_at"],
        "mine" => intval($row["sender_id"]) === $user_id
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $messages
]);
?>