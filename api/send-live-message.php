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
$message = trim($_POST['message'] ?? '');
$message_type = trim($_POST['message_type'] ?? 'chat');

$allowedTypes = ['chat', 'system', 'bid', 'hand'];

if ($auction_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid auction_id"
    ]);
    exit;
}

if ($message === '') {
    echo json_encode([
        "status" => "error",
        "message" => "Message is empty"
    ]);
    exit;
}

if (!in_array($message_type, $allowedTypes)) {
    $message_type = 'chat';
}

if (mb_strlen($message) > 500) {
    echo json_encode([
        "status" => "error",
        "message" => "Message is too long"
    ]);
    exit;
}

$createTable = "CREATE TABLE IF NOT EXISTS live_messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  user_id INT(11) NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('chat','system','bid','hand') NOT NULL DEFAULT 'chat',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY auction_id (auction_id),
  KEY user_id (user_id),
  KEY created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

mysqli_query($conn, $createTable);

$stmt = $conn->prepare("
    INSERT INTO live_messages (auction_id, user_id, message, message_type)
    VALUES (?, ?, ?, ?)
");

$stmt->bind_param("iiss", $auction_id, $user_id, $message, $message_type);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message_id" => $stmt->insert_id
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $stmt->error
    ]);
}
?>