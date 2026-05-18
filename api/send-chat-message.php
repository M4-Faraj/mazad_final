<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

function addNotification($conn, $user_id, $type, $subject, $body, $link = null, $auction_id = null) {
    $sent_email = 0;

    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if ($stmt) {
        $stmt->bind_param("isssiis", $user_id, $type, $subject, $body, $sent_email, $auction_id, $link);
        $stmt->execute();
    }
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "not logged in"]);
    exit;
}

$sender_id = intval($_SESSION['user_id']);
$receiver_id = intval($_POST['receiver_id'] ?? 0);
$message = trim($_POST['message'] ?? '');

if ($receiver_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Missing receiver_id"]);
    exit;
}

if ($message === '') {
    echo json_encode(["status" => "error", "message" => "Message is required"]);
    exit;
}

if (mb_strlen($message) > 1000) {
    echo json_encode(["status" => "error", "message" => "Message is too long"]);
    exit;
}

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
    echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$check->bind_param("iiii", $sender_id, $receiver_id, $receiver_id, $sender_id);
$check->execute();
$friendship = $check->get_result()->fetch_assoc();

if (!$friendship) {
    echo json_encode(["status" => "error", "message" => "You can only chat with accepted friends"]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO chat_messages (sender_id, receiver_id, message)
    VALUES (?, ?, ?)
");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param("iis", $sender_id, $receiver_id, $message);

if ($stmt->execute()) {
    $senderName = "Someone";

    $nameStmt = $conn->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    if ($nameStmt) {
        $nameStmt->bind_param("i", $sender_id);
        $nameStmt->execute();
        $nameRow = $nameStmt->get_result()->fetch_assoc();

        if ($nameRow && !empty($nameRow["name"])) {
            $senderName = $nameRow["name"];
        }
    }

    addNotification(
        $conn,
        $receiver_id,
        "chat_message",
        "New message",
        $senderName . " sent you a new message.",
        "profile.html#friendsPanel",
        null
    );

    echo json_encode(["status" => "success", "message" => "Message sent"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>