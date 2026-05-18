<?php
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "./_stats.php";

ensureStatsSchema($conn);

// optional limit
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$limit = max(1, min(500, $limit));

$sql = "SELECT l.id, l.user_id, l.delta, l.reason, l.auction_id, l.created_at, u.name as user_name, u.email as user_email
        FROM token_ledger l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.id DESC
        LIMIT ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $limit);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while($r = $res->fetch_assoc()){
    $rows[] = $r;
}

echo json_encode(["status"=>"success","data"=>$rows]);
