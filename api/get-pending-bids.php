<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
    echo json_encode(["status" => "error", "message" => "not authorized"]);
    exit;
}

$role = $_SESSION['user_role'];

if ($role !== "admin" && $role !== "employee") {
    echo json_encode(["status" => "error", "message" => "insufficient privileges"]);
    exit;
}

$sql = "
    SELECT 
        b.id AS bid_id,
        b.auction_id,
        b.user_id,
        b.bid_amount,
        b.status,
        b.review_reason,
        b.created_at,
        u.name AS bidder_name,
        u.email AS bidder_email,
        a.title AS auction_title,
        a.category,
        a.current_price,
        a.start_price,
        a.status AS auction_status
    FROM bids b
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN auctions a ON a.id = b.auction_id
    WHERE b.status = 'pending'
    ORDER BY b.created_at DESC
";

$res = mysqli_query($conn, $sql);

if (!$res) {
    echo json_encode([
        "status" => "error",
        "message" => mysqli_error($conn)
    ]);
    exit;
}

$data = [];

while ($row = mysqli_fetch_assoc($res)) {
    $data[] = [
        "bid_id" => intval($row["bid_id"]),
        "auction_id" => intval($row["auction_id"]),
        "user_id" => intval($row["user_id"]),
        "bid_amount" => floatval($row["bid_amount"]),
        "status" => $row["status"],
        "review_reason" => $row["review_reason"],
        "created_at" => $row["created_at"],
        "bidder_name" => $row["bidder_name"],
        "bidder_email" => $row["bidder_email"],
        "auction_title" => $row["auction_title"],
        "category" => $row["category"],
        "current_price" => floatval($row["current_price"]),
        "start_price" => floatval($row["start_price"]),
        "auction_status" => $row["auction_status"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $data
]);
?>