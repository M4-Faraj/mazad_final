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

$sender_id = intval($_SESSION['user_id']);
$receiver_id = intval($_POST['receiver_id'] ?? 0);

if ($receiver_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing receiver_id"
    ]);
    exit;
}

if ($receiver_id === $sender_id) {
    echo json_encode([
        "status" => "error",
        "message" => "You cannot add yourself"
    ]);
    exit;
}

/*
  Check if receiver exists
*/
$checkUser = $conn->prepare("SELECT id FROM users WHERE id = ?");
$checkUser->bind_param("i", $receiver_id);
$checkUser->execute();
$userRes = $checkUser->get_result();

if ($userRes->num_rows === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);
    exit;
}

/*
  Check existing request/friendship both directions.
*/
$check = $conn->prepare("
    SELECT id, status
    FROM friend_requests
    WHERE
      (sender_id = ? AND receiver_id = ?)
      OR
      (sender_id = ? AND receiver_id = ?)
    LIMIT 1
");

$check->bind_param("iiii", $sender_id, $receiver_id, $receiver_id, $sender_id);
$check->execute();
$existing = $check->get_result()->fetch_assoc();

if ($existing) {
    echo json_encode([
        "status" => "error",
        "message" => "Friend request already exists",
        "friendship_status" => $existing["status"]
    ]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    VALUES (?, ?, 'pending')
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("ii", $sender_id, $receiver_id);

if ($stmt->execute()) {
    $senderName = "Someone";

    $nameStmt = $conn->prepare("SELECT name FROM users WHERE id = ?");
    if ($nameStmt) {
        $nameStmt->bind_param("i", $sender_id);
        $nameStmt->execute();
        $nameRes = $nameStmt->get_result();
        $nameRow = $nameRes->fetch_assoc();
        if ($nameRow && !empty($nameRow["name"])) {
            $senderName = $nameRow["name"];
        }
    }

    $type = "friend_request";
    $subject = "New friend request";
    $body = $senderName . " sent you a friend request.";
    $link = "profile.html#friendsPanel";
    $sent_email = 0;
    $auction_id = null;

    $notif = $conn->prepare("
        INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if ($notif) {
        $notif->bind_param(
            "isssiis",
            $receiver_id,
            $type,
            $subject,
            $body,
            $sent_email,
            $auction_id,
            $link
        );
        $notif->execute();
    }

    echo json_encode([
        "status" => "success",
        "message" => "Friend request sent"
    ]);
}else {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to send request: " . $stmt->error
    ]);
}
?>