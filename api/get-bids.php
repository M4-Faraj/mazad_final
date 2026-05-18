<?php
header("Content-Type: application/json");
require_once "../config/db.php";

$auction_id = isset($_GET['auction_id']) ? intval($_GET['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid auction_id"
    ]);
    exit;
}

$sql = "
    SELECT 
        b.id,
        b.auction_id,
        b.user_id,
        b.bid_amount,
        b.created_at,
        u.name AS bidder_name
    FROM bids b
    LEFT JOIN users u ON u.id = b.user_id
   WHERE b.auction_id = ?
AND b.status = 'approved'
   ORDER BY b.bid_amount DESC, b.id DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $auction_id);
$stmt->execute();

$result = $stmt->get_result();
$bids = [];

while ($row = $result->fetch_assoc()) {
    $bids[] = [
        "id" => intval($row["id"]),
        "auction_id" => intval($row["auction_id"]),
        "user_id" => intval($row["user_id"]),
        "amount" => floatval($row["bid_amount"]),
        "bidder" => $row["bidder_name"] ?: "User#" . $row["user_id"],
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "status" => "success",
    "highest_approved_bid" => isset($bids[0]) ? $bids[0]["amount"] : 0,
    "highest_bidder_name" => isset($bids[0]) ? $bids[0]["bidder"] : null,
    "data" => $bids
]);
?>
