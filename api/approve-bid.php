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

$conn->begin_transaction();

try {
    $bidQ = $conn->prepare("
        SELECT 
            b.id,
            b.auction_id,
            b.user_id,
            b.bid_amount,
            b.status,
            a.user_id AS seller_id,
            a.current_price,
            a.start_price,
            a.status AS auction_status,
            a.title AS auction_title
        FROM bids b
        INNER JOIN auctions a ON a.id = b.auction_id
        WHERE b.id = ?
        LIMIT 1
        FOR UPDATE
    ");

    $bidQ->bind_param("i", $bid_id);
    $bidQ->execute();

    $bid = $bidQ->get_result()->fetch_assoc();

    if (!$bid) {
        throw new Exception("Bid not found");
    }

    if ($bid["status"] !== "pending") {
        throw new Exception("This bid is not pending");
    }

    if ($bid["auction_status"] !== "approved") {
        throw new Exception("Auction is not active");
    }

    $amount = floatval($bid["bid_amount"]);
    $auction_id = intval($bid["auction_id"]);
    $bidder_id = intval($bid["user_id"]);
    $seller_id = intval($bid["seller_id"]);
    $auction_title = $bid["auction_title"];
    $base_price = max(floatval($bid["current_price"]), floatval($bid["start_price"]));

    if ($amount <= $base_price) {
        $reject = $conn->prepare("
            UPDATE bids
            SET status = 'rejected',
                review_reason = 'Rejected automatically: bid is no longer higher than current price'
            WHERE id = ?
        ");
        $reject->bind_param("i", $bid_id);
        $reject->execute();

        addNotification(
            $conn,
            $bidder_id,
            "bid_rejected",
            "Bid rejected",
            "Your bid on \"" . $auction_title . "\" was rejected because it is no longer higher than the current price.",
            "auction-details.html?id=" . $auction_id,
            $auction_id
        );

        throw new Exception("Bid is no longer higher than the current price and was rejected");
    }

    $approve = $conn->prepare("
        UPDATE bids
        SET status = 'approved',
            review_reason = NULL
        WHERE id = ?
    ");
    $approve->bind_param("i", $bid_id);

    if (!$approve->execute()) {
        throw new Exception("Failed to approve bid");
    }

    $updateAuction = $conn->prepare("
        UPDATE auctions
        SET current_price = ?
        WHERE id = ?
    ");
    $updateAuction->bind_param("di", $amount, $auction_id);

    if (!$updateAuction->execute()) {
        throw new Exception("Failed to update auction price");
    }

    addNotification(
        $conn,
        $bidder_id,
        "bid_approved",
        "Bid approved",
        "Your bid of $" . number_format($amount) . " on \"" . $auction_title . "\" has been approved.",
        "auction-details.html?id=" . $auction_id,
        $auction_id
    );

    if ($seller_id !== $bidder_id) {
        addNotification(
            $conn,
            $seller_id,
            "bid_approved_seller",
            "Bid approved on your auction",
            "A bid of $" . number_format($amount) . " on your auction \"" . $auction_title . "\" has been approved.",
            "profile.html#myAuctionsPanel",
            $auction_id
        );
    }

    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Bid approved successfully",
        "auction_id" => $auction_id,
        "bid_id" => $bid_id,
        "amount" => $amount
    ]);
} catch (Exception $e) {
    $conn->rollback();

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>