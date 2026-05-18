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

$createTable = "CREATE TABLE IF NOT EXISTS live_viewers (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  user_id INT(11) NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_live_user (auction_id, user_id),
  KEY auction_id (auction_id),
  KEY user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

mysqli_query($conn, $createTable);

$stmt = $conn->prepare("
    INSERT INTO live_viewers (auction_id, user_id, joined_at, last_seen)
    VALUES (?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE last_seen = NOW()
");

$stmt->bind_param("ii", $auction_id, $user_id);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "joined live room"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>