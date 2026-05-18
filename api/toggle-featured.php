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

if ($auction_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid auction id"]);
    exit;
}

$uq = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
$uq->bind_param("i", $user_id);
$uq->execute();
$u = $uq->get_result()->fetch_assoc();

if (!$u || !in_array(strtolower((string)$u['role']), ['admin', 'employee'], true)) {
    echo json_encode(["status" => "error", "message" => "Admins or employees only"]);
    exit;
}

$check = mysqli_query($conn, "SHOW COLUMNS FROM auctions LIKE 'featured'");
if ($check && mysqli_num_rows($check) === 0) {
    mysqli_query($conn, "ALTER TABLE auctions ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0");
}

$auction = getAuctionInfo($conn, $auction_id);

if (!$auction) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$cur = $conn->prepare("SELECT featured FROM auctions WHERE id = ? LIMIT 1");
$cur->bind_param("i", $auction_id);
$cur->execute();
$row = $cur->get_result()->fetch_assoc();

if (!$row) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$new = intval($row['featured']) === 1 ? 0 : 1;

$upd = $conn->prepare("UPDATE auctions SET featured = ? WHERE id = ?");
$upd->bind_param("ii", $new, $auction_id);

if ($upd->execute()) {
    if ($new === 1) {
        addNotification(
            $conn,
            intval($auction["user_id"]),
            "auction_important",
            "Auction marked important",
            "Your auction \"" . $auction["title"] . "\" has been marked as Important.",
            "profile.html#myAuctionsPanel",
            $auction_id
        );
    } else {
        addNotification(
            $conn,
            intval($auction["user_id"]),
            "auction_unimportant",
            "Auction unmarked important",
            "Your auction \"" . $auction["title"] . "\" is no longer marked as Important.",
            "profile.html#myAuctionsPanel",
            $auction_id
        );
    }

    echo json_encode([
        "status" => "success",
        "auction_id" => $auction_id,
        "featured" => $new === 1
    ]);
} else {
    echo json_encode(["status" => "error", "message" => $upd->error]);
}
?>