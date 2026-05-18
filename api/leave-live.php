<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$user_id = intval($_SESSION['user_id']);
$auction_id = isset($_POST['auction_id']) ? intval($_POST['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid auction_id"
    ]);
    exit;
}

$stmt = $conn->prepare("
    DELETE FROM live_viewers
    WHERE auction_id = ?
    AND user_id = ?
");

$stmt->bind_param("ii", $auction_id, $user_id);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "left live room"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>