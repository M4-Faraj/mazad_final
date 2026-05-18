<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "_notifications.php";

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

$auction = getAuctionInfo($conn, $auction_id);

if (!$auction) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$stmt = $conn->prepare("UPDATE auctions SET status = 'rejected' WHERE id = ?");
$stmt->bind_param("i", $auction_id);

if ($stmt->execute()) {
    addNotification(
        $conn,
        intval($auction["user_id"]),
        "auction_rejected",
        "Auction rejected",
        "Your auction \"" . $auction["title"] . "\" has been rejected.",
        "profile.html#myAuctionsPanel",
        $auction_id
    );

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>