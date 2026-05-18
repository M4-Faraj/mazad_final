<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "not logged in"]);
    exit;
}

$user_id = intval($_SESSION['user_id']);

$sql    = "SELECT a.*, f.id AS favorite_id FROM auctions a
           JOIN favorites f ON f.auction_id = a.id
           WHERE f.user_id = ? ORDER BY f.id DESC";
$stmt   = $conn->prepare($sql);
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();

$favorites = [];
while ($row = $result->fetch_assoc()) {
    $auction_id = intval($row['id']);
    $images     = [];
    $imgSql     = "SELECT file_path FROM auction_images WHERE auction_id = $auction_id";
    $imgRes     = @mysqli_query($conn, $imgSql);
    if ($imgRes) {
        while ($ir = mysqli_fetch_assoc($imgRes)) {
            $images[] = $ir['file_path'];
        }
    }
    $row['images'] = $images;
    $favorites[]   = $row;
}

echo json_encode(["status" => "success", "data" => $favorites]);
?>
