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

$check = $conn->prepare("SELECT id FROM favorites WHERE user_id=? AND auction_id=?");
$check->bind_param('ii', $user_id, $auction_id);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    echo json_encode(["status" => "exists"]);
    exit;
}

$ins = $conn->prepare("INSERT INTO favorites (user_id, auction_id) VALUES (?, ?)");
$ins->bind_param('ii', $user_id, $auction_id);
if ($ins->execute()) {
    echo json_encode(["status" => "success", "favorite_id" => $ins->insert_id]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
?>
