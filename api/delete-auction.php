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

/*
  Send notification before deleting the auction,
  because after deletion we may lose owner/title data.
*/
addNotification(
    $conn,
    intval($auction["user_id"]),
    "auction_deleted",
    "Auction deleted",
    "Your auction \"" . $auction["title"] . "\" has been deleted by admin.",
    "profile.html#myAuctionsPanel",
    $auction_id
);

// delete images from filesystem, restricted to images/auctions/
$imgStmt = $conn->prepare("SELECT file_path FROM auction_images WHERE auction_id = ?");
if ($imgStmt) {
    $imgStmt->bind_param("i", $auction_id);
    $imgStmt->execute();
    $imgRes = $imgStmt->get_result();
    $allowedDir = realpath(__DIR__ . '/../images/auctions');

    while ($ir = $imgRes->fetch_assoc()) {
        if (!$allowedDir || empty($ir['file_path'])) {
            continue;
        }

        $candidate = realpath(__DIR__ . '/../' . $ir['file_path']);
        if (
            $candidate &&
            strpos($candidate, $allowedDir . DIRECTORY_SEPARATOR) === 0 &&
            is_file($candidate)
        ) {
            @unlink($candidate);
        }
    }
}

// delete auction
$stmt = $conn->prepare("DELETE FROM auctions WHERE id = ?");
$stmt->bind_param("i", $auction_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>
