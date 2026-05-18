<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";
require_once "_notifications.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$user_id = intval($_SESSION['user_id']);
$notification_id = isset($_POST['notification_id']) ? intval($_POST['notification_id']) : 0;

if ($notification_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing notification_id"
    ]);
    exit;
}

ensureNotificationsTable($conn);

$stmt = $conn->prepare("
    DELETE FROM notifications
    WHERE id = ?
      AND user_id = ?
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("ii", $notification_id, $user_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>