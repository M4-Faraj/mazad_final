<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

$auction_id = isset($_POST['auction_id']) ? intval($_POST['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Missing auction_id"]);
    exit;
}

$user_id = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : null;
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

$conn->query("
    CREATE TABLE IF NOT EXISTS auction_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        auction_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        ip_address VARCHAR(64) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (auction_id),
        INDEX (user_id)
    )
");

/*
  Avoid counting refresh spam:
  Same logged-in user OR same IP on same auction counts once per 10 minutes.
*/
if ($user_id) {
    $check = $conn->prepare("
        SELECT id
        FROM auction_views
        WHERE auction_id = ?
          AND user_id = ?
          AND viewed_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        LIMIT 1
    ");
    $check->bind_param("ii", $auction_id, $user_id);
} else {
    $check = $conn->prepare("
        SELECT id
        FROM auction_views
        WHERE auction_id = ?
          AND ip_address = ?
          AND viewed_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        LIMIT 1
    ");
    $check->bind_param("is", $auction_id, $ip);
}

$check->execute();
$exists = $check->get_result()->fetch_assoc();

if (!$exists) {
    $stmt = $conn->prepare("
        INSERT INTO auction_views (auction_id, user_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->bind_param("iiss", $auction_id, $user_id, $ip, $user_agent);
    $stmt->execute();
}

echo json_encode(["status" => "success"]);
?>