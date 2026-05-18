<?php
header("Content-Type: application/json");

require_once "../config/db.php";

$auction_id = isset($_GET['auction_id']) ? intval($_GET['auction_id']) : 0;
$after_id = isset($_GET['after_id']) ? intval($_GET['after_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid auction_id"
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

$sql = "
    SELECT 
        lm.id,
        lm.auction_id,
        lm.user_id,
        lm.message,
        lm.message_type,
        lm.created_at,
        u.name AS user_name,
        u.profile_image
    FROM live_messages lm
    LEFT JOIN users u ON u.id = lm.user_id
    WHERE lm.auction_id = ?
      AND lm.id > ?
    ORDER BY lm.id ASC
    LIMIT 50
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $auction_id, $after_id);
$stmt->execute();

$result = $stmt->get_result();
$messages = [];

while ($row = $result->fetch_assoc()) {
    $messages[] = [
        "id" => intval($row["id"]),
        "auction_id" => intval($row["auction_id"]),
        "user_id" => intval($row["user_id"]),
        "user_name" => $row["user_name"] ?: "User#" . $row["user_id"],
        "profile_image" => $row["profile_image"] ?: null,
        "message" => $row["message"],
        "message_type" => $row["message_type"],
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $messages
]);
?>