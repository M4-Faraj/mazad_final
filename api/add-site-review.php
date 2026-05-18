<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "You must login first"
    ]);
    exit;
}

$user_id = intval($_SESSION['user_id']);
$content = trim($_POST['content'] ?? '');

if ($content === '') {
    echo json_encode([
        "status" => "error",
        "message" => "Review content is required"
    ]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO site_reviews (user_id, content) VALUES (?, ?)");
$stmt->bind_param("is", $user_id, $content);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "Review added successfully"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to add review"
    ]);
}
?>