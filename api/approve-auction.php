<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

function ensureNotificationsTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            link VARCHAR(255) DEFAULT NULL,
            auction_id INT DEFAULT NULL,
            is_read TINYINT(1) DEFAULT 0,
            sent_email TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
}

function addNotification($conn, $user_id, $type, $subject, $body, $link = null, $auction_id = null) {
    ensureNotificationsTable($conn);

    $sent_email = 0;
    $auction_id = $auction_id !== null ? intval($auction_id) : null;

    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if ($stmt) {
        $stmt->bind_param("isssiis", $user_id, $type, $subject, $body, $sent_email, $auction_id, $link);
        $stmt->execute();
    }
}

function notifyAllUsersExceptSeller($conn, $seller_id, $auction_id, $auction_title) {
    ensureNotificationsTable($conn);

    $seller_id = intval($seller_id);
    $auction_id = intval($auction_id);

    $users = $conn->query("
        SELECT id
        FROM users
        WHERE id != $seller_id
    ");

    if (!$users) return;

    $type = "auction_new";
    $subject = "New auction available";
    $body = "A new auction is now available: " . $auction_title;
    $link = "auction-details.html?id=" . $auction_id;

    $sent_email = 0;

    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) return;

    while ($row = $users->fetch_assoc()) {
        $target_user_id = intval($row["id"]);
        $stmt->bind_param("isssiis", $target_user_id, $type, $subject, $body, $sent_email, $auction_id, $link);
        $stmt->execute();
    }
}

if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
    echo json_encode(["status" => "error", "message" => "not authorized"]);
    exit;
}

$role = $_SESSION['user_role'];

if ($role !== 'admin' && $role !== 'employee') {
    echo json_encode(["status" => "error", "message" => "insufficient privileges"]);
    exit;
}

if (!isset($_POST['auction_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing auction_id"]);
    exit;
}

$auction_id = intval($_POST['auction_id']);

$info = $conn->prepare("SELECT user_id, title FROM auctions WHERE id = ? LIMIT 1");
$info->bind_param("i", $auction_id);
$info->execute();
$auction = $info->get_result()->fetch_assoc();

if (!$auction) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$stmt = $conn->prepare("UPDATE auctions SET status = 'approved' WHERE id = ?");
$stmt->bind_param("i", $auction_id);

if ($stmt->execute()) {
    $seller_id = intval($auction["user_id"]);
    $auction_title = $auction["title"];

    addNotification(
        $conn,
        $seller_id,
        "auction_approved",
        "Auction approved",
        "Your auction \"" . $auction_title . "\" has been approved.",
        "profile.html#myAuctionsPanel",
        $auction_id
    );

    notifyAllUsersExceptSeller(
        $conn,
        $seller_id,
        $auction_id,
        $auction_title
    );

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>