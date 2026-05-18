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
$request_id = intval($_POST['request_id'] ?? 0);
$action = strtolower(trim($_POST['action'] ?? ''));

if ($request_id <= 0 || !in_array($action, ['accept', 'reject'], true)) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid request"
    ]);
    exit;
}

$new_status = $action === 'accept' ? 'accepted' : 'rejected';

$stmt = $conn->prepare("
    UPDATE friend_requests
    SET status = ?, responded_at = NOW()
    WHERE id = ?
      AND receiver_id = ?
      AND status = 'pending'
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("sii", $new_status, $request_id, $user_id);
$stmt->execute();
if ($stmt->affected_rows > 0) {
    $sender_id = null;
    $receiverName = "Your friend";

    $infoStmt = $conn->prepare("
        SELECT fr.sender_id, u.name AS receiver_name
        FROM friend_requests fr
        JOIN users u ON u.id = fr.receiver_id
        WHERE fr.id = ?
        LIMIT 1
    ");

    if ($infoStmt) {
        $infoStmt->bind_param("i", $request_id);
        $infoStmt->execute();
        $infoRes = $infoStmt->get_result();
        $info = $infoRes->fetch_assoc();

        if ($info) {
            $sender_id = intval($info["sender_id"]);
            if (!empty($info["receiver_name"])) {
                $receiverName = $info["receiver_name"];
            }
        }
    }

    if ($sender_id) {
        $type = $new_status === "accepted" ? "friend_request_accepted" : "friend_request_rejected";
        $subject = $new_status === "accepted" ? "Friend request accepted" : "Friend request rejected";
        $body = $receiverName . " " . ($new_status === "accepted" ? "accepted" : "rejected") . " your friend request.";
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
                $sender_id,
                $type,
                $subject,
                $body,
                $sent_email,
                $auction_id,
                $link
            );
            $notif->execute();
        }
    }

    echo json_encode([
        "status" => "success",
        "message" => $new_status
    ]);
}else {
    echo json_encode([
        "status" => "error",
        "message" => "Request not found or already handled"
    ]);
}
?>