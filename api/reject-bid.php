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

if ($role !== "admin" && $role !== "employee") {
    echo json_encode(["status" => "error", "message" => "insufficient privileges"]);
    exit;
}

$bid_id = isset($_POST['bid_id']) ? intval($_POST['bid_id']) : 0;

if ($bid_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Missing bid_id"]);
    exit;
}

$info = $conn->prepare("
    SELECT 
        b.user_id AS bidder_id,
        b.auction_id,
        b.bid_amount,
        a.user_id AS seller_id,
        a.title AS auction_title
    FROM bids b
    INNER JOIN auctions a ON a.id = b.auction_id
    WHERE b.id = ?
    LIMIT 1
");

if (!$info) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$info->bind_param("i", $bid_id);
$info->execute();
$bid = $info->get_result()->fetch_assoc();

if (!$bid) {
    echo json_encode(["status" => "error", "message" => "Bid not found"]);
    exit;
}

$stmt = $conn->prepare("
    UPDATE bids
    SET status = 'rejected',
        review_reason = 'Rejected by admin'
    WHERE id = ?
      AND status = 'pending'
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $bid_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        $auction_id = intval($bid["auction_id"]);
        $bidder_id = intval($bid["bidder_id"]);
        $seller_id = intval($bid["seller_id"]);
        $amount = floatval($bid["bid_amount"]);
        $auction_title = $bid["auction_title"];

        addNotification(
            $conn,
            $bidder_id,
            "bid_rejected",
            "Bid rejected",
            "Your bid of $" . number_format($amount) . " on \"" . $auction_title . "\" has been rejected.",
            "auction-details.html?id=" . $auction_id,
            $auction_id
        );

        if ($seller_id !== $bidder_id) {
            addNotification(
                $conn,
                $seller_id,
                "bid_rejected_seller",
                "Bid rejected on your auction",
                "A bid of $" . number_format($amount) . " on your auction \"" . $auction_title . "\" has been rejected.",
                "profile.html#myAuctionsPanel",
                $auction_id
            );
        }
    }

    echo json_encode([
        "status" => "success",
        "message" => "Bid rejected successfully"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>