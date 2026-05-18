<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

$user_id    = intval($_SESSION['user_id']);
$auction_id = isset($_POST['auction_id']) ? intval($_POST['auction_id']) : 0;
$content    = isset($_POST['content']) ? trim($_POST['content']) : '';

if ($auction_id <= 0 || $content === '') {
    echo json_encode(["status" => "error", "message" => "Invalid auction or empty comment"]);
    exit;
}

if (mb_strlen($content) > 1000) {
    $content = mb_substr($content, 0, 1000);
}

$create = "CREATE TABLE IF NOT EXISTS auction_comments (
    id INT(11) NOT NULL AUTO_INCREMENT,
    auction_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY (auction_id),
    KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";
mysqli_query($conn, $create);

$createLog = "CREATE TABLE IF NOT EXISTS comment_deletion_log (
    id INT(11) NOT NULL AUTO_INCREMENT,
    comment_id INT(11) NOT NULL,
    auction_id INT(11) NOT NULL,
    author_id INT(11) NOT NULL,
    deleted_by INT(11) NOT NULL,
    deleted_role VARCHAR(32) DEFAULT NULL,
    content_snapshot TEXT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY (auction_id),
    KEY (deleted_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";
mysqli_query($conn, $createLog);

$checkAuction = $conn->prepare("SELECT id FROM auctions WHERE id = ? LIMIT 1");
$checkAuction->bind_param("i", $auction_id);
$checkAuction->execute();
if (!$checkAuction->get_result()->fetch_assoc()) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO auction_comments (auction_id, user_id, content) VALUES (?, ?, ?)");
$stmt->bind_param("iis", $auction_id, $user_id, $content);

if (!$stmt->execute()) {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
    exit;
}

$comment_id = $stmt->insert_id;

$q = $conn->prepare("
    SELECT c.id, c.auction_id, c.user_id, c.content, c.created_at,
           u.name AS author_name, u.role AS author_role, u.profile_image
    FROM auction_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
");
$q->bind_param("i", $comment_id);
$q->execute();
$row = $q->get_result()->fetch_assoc();

echo json_encode([
    "status"  => "success",
    "comment" => $row
]);
?>
