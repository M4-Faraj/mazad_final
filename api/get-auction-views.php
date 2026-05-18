<?php
header("Content-Type: application/json");

require_once "../config/db.php";

$auction_id = isset($_GET['auction_id']) ? intval($_GET['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Missing auction_id"]);
    exit;
}

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
  Count unique viewers:
  - logged-in users by user_id
  - guests by ip_address
*/
$stmt = $conn->prepare("
    SELECT
      COUNT(DISTINCT COALESCE(CONCAT('u:', user_id), CONCAT('ip:', ip_address))) AS views_count
    FROM auction_views
    WHERE auction_id = ?
");

$stmt->bind_param("i", $auction_id);
$stmt->execute();

$row = $stmt->get_result()->fetch_assoc();

echo json_encode([
    "status" => "success",
    "views_count" => intval($row["views_count"] ?? 0)
]);
?>