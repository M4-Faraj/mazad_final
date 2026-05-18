<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";
require_once "_notifications.php";
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

$user_id = intval($_SESSION['user_id']);

$auction_id = isset($_POST['auction_id']) ? intval($_POST['auction_id']) : 0;
$amount = isset($_POST['amount']) ? floatval($_POST['amount']) : 0;

if ($auction_id <= 0 || $amount <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid auction or amount"]);
    exit;
}

$conn->begin_transaction();

try {
    $auctionQ = $conn->prepare("
        SELECT
            id,
              title,
            user_id,
            current_price,
            start_price,
            status,
            end_time,
            auction_type,
            expected_final_price,
            max_acceptable_price
        FROM auctions
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
    ");

    if (!$auctionQ) {
        throw new Exception("Failed to prepare auction query");
    }

    $auctionQ->bind_param("i", $auction_id);
    $auctionQ->execute();

    $auctionRes = $auctionQ->get_result();
    $auction = $auctionRes->fetch_assoc();

    if (!$auction) {
        throw new Exception("Auction not found");
    }

    if ($auction['status'] !== 'approved') {
        throw new Exception("Auction is not active");
    }

   
    if (intval($auction['user_id']) === $user_id) {
        throw new Exception("You cannot bid on your own auction");
    }

    if (!empty($auction['end_time']) && strtotime($auction['end_time']) <= time()) {
        throw new Exception("Auction has ended");
    }

    $highestQ = $conn->prepare("
        SELECT
            b.bid_amount,
            u.name AS bidder_name
        FROM bids b
        LEFT JOIN users u ON u.id = b.user_id
        WHERE b.auction_id = ?
          AND b.status = 'approved'
        ORDER BY b.bid_amount DESC, b.id DESC
        LIMIT 1
    ");

    if (!$highestQ) {
        throw new Exception("Failed to prepare highest bid query");
    }

    $highestQ->bind_param("i", $auction_id);
    $highestQ->execute();
    $highestApproved = $highestQ->get_result()->fetch_assoc();

    $current_price = floatval($auction['current_price']);
    $start_price = floatval($auction['start_price']);
    $highest_approved_bid = $highestApproved ? floatval($highestApproved['bid_amount']) : 0;
    $highest_bidder_name = $highestApproved && !empty($highestApproved['bidder_name']) ? $highestApproved['bidder_name'] : null;
    $base_price = max($current_price, $start_price, $highest_approved_bid);

    if ($amount <= $base_price) {
        throw new Exception("Bid must be higher than current price");
    }

    /*
      Smart review logic:
      1. If seller set max_acceptable_price, any bid above it goes pending.
      2. Otherwise fallback to old high-value rules:
         - jump above 3x base price or at least 1,000,000
         - absolute limit above 10,000,000
    */
    $needsApproval = false;
    $reviewReason = null;

    $expectedFinalPrice = isset($auction['expected_final_price']) ? floatval($auction['expected_final_price']) : 0;
    $maxAcceptablePrice = isset($auction['max_acceptable_price']) ? floatval($auction['max_acceptable_price']) : 0;

    if ($maxAcceptablePrice > 0 && $amount > $maxAcceptablePrice) {
        $needsApproval = true;
        $reviewReason = "Bid exceeds seller max bid before review";
    } else {
        $jumpLimit = max($base_price * 3, 1000000);
        $absoluteLimit = 10000000;

        if ($amount > $jumpLimit || $amount > $absoluteLimit) {
            $needsApproval = true;
            $reviewReason = "High value bid requires admin approval";
        }
    }

    $bidStatus = $needsApproval ? "pending" : "approved";

    $ins = $conn->prepare("
        INSERT INTO bids (auction_id, user_id, bid_amount, status, review_reason)
        VALUES (?, ?, ?, ?, ?)
    ");

    if (!$ins) {
        throw new Exception("Failed to prepare bid insert");
    }

    $ins->bind_param("iidss", $auction_id, $user_id, $amount, $bidStatus, $reviewReason);

    if (!$ins->execute()) {
        throw new Exception("Failed to insert bid");
    }

    $bid_id = $ins->insert_id;

    /*
      Only approved bids update current_price.
      Pending bids wait for admin approval.
    */
    if (!$needsApproval) {
        $update = $conn->prepare("
            UPDATE auctions
            SET current_price = ?
            WHERE id = ?
        ");

        if (!$update) {
            throw new Exception("Failed to prepare auction price update");
        }

        $update->bind_param("di", $amount, $auction_id);

        if (!$update->execute()) {
            throw new Exception("Failed to update auction price");
        }
    }

    $refreshedHighestQ = $conn->prepare("
        SELECT
            b.bid_amount,
            u.name AS bidder_name
        FROM bids b
        LEFT JOIN users u ON u.id = b.user_id
        WHERE b.auction_id = ?
          AND b.status = 'approved'
        ORDER BY b.bid_amount DESC, b.id DESC
        LIMIT 1
    ");

    if (!$refreshedHighestQ) {
        throw new Exception("Failed to prepare refreshed highest bid query");
    }

    $refreshedHighestQ->bind_param("i", $auction_id);
    $refreshedHighestQ->execute();
    $refreshedHighest = $refreshedHighestQ->get_result()->fetch_assoc();
    $currentHighestApprovedBid = $refreshedHighest ? floatval($refreshedHighest['bid_amount']) : $base_price;
    $currentHighestBidderName = $refreshedHighest && !empty($refreshedHighest['bidder_name'])
        ? $refreshedHighest['bidder_name']
        : $highest_bidder_name;

 $auctionTitle = $auction['title'] ?? 'auction';
$sellerId = intval($auction['user_id']);

/* Notify seller that a bid was placed */
addNotification(
    $conn,
    $sellerId,
    $needsApproval ? "bid_pending_seller" : "bid_received",
    $needsApproval ? "Bid waiting for approval" : "New bid received",
    $needsApproval
        ? "A bid of $" . number_format($amount, 2) . " on your auction \"" . $auctionTitle . "\" is waiting for admin approval."
        : "A new bid of $" . number_format($amount, 2) . " was placed on your auction \"" . $auctionTitle . "\".",
    "profile.html#myAuctionsPanel",
    $auction_id
);

/* If bid needs approval, notify admin and employee */
if ($needsApproval) {
    notifyStaff(
        $conn,
        "bid_pending",
        "Bid needs approval",
        "A bid of $" . number_format($amount, 2) . " on \"" . $auctionTitle . "\" needs approval.",
        "Admin.html",
        $auction_id
    );
}
    $userQ = $conn->prepare("
        SELECT id, name
        FROM users
        WHERE id = ?
        LIMIT 1
    ");

    if (!$userQ) {
        throw new Exception("Failed to prepare user query");
    }

    $userQ->bind_param("i", $user_id);
    $userQ->execute();

    $user = $userQ->get_result()->fetch_assoc();

    $conn->commit();

    echo json_encode([
        "status" => "success",
        "bid_id" => $bid_id,
        "auction_id" => $auction_id,
        "amount" => $amount,
        "bid_status" => $bidStatus,
        "needs_approval" => $needsApproval,
        "current_price" => $currentHighestApprovedBid,
        "highest_approved_bid" => $currentHighestApprovedBid,
        "highest_bidder_name" => $currentHighestBidderName,
        "expected_final_price" => $expectedFinalPrice,
        "max_acceptable_price" => $maxAcceptablePrice,
        "message" => $needsApproval
            ? "Your bid was submitted and is waiting for admin approval"
            : "Bid placed successfully",
        "user" => $user
    ]);
} catch (Exception $e) {
    $conn->rollback();

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
