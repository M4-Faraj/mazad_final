<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "not logged in"]);
    exit;
}

if (!isset($_POST['auction_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing auction_id"]);
    exit;
}

$user_id    = intval($_SESSION['user_id']);
$auction_id = intval($_POST['auction_id']);

$stmt = $conn->prepare("DELETE FROM favorites WHERE user_id=? AND auction_id=?");
$stmt->bind_param('ii', $user_id, $auction_id);
if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
?>
