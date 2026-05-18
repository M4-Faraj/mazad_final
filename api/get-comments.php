<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

$auction_id = isset($_GET['auction_id']) ? intval($_GET['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid auction id"]);
    exit;
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

$current_user_id = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
$current_user_role = '';

if ($current_user_id > 0) {
    $uq = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $uq->bind_param("i", $current_user_id);
    $uq->execute();
    $u = $uq->get_result()->fetch_assoc();
    if ($u) $current_user_role = strtolower((string)$u['role']);
}

$stmt = $conn->prepare("
    SELECT c.id, c.auction_id, c.user_id, c.content, c.created_at,
           u.name AS author_name, u.role AS author_role, u.profile_image
    FROM auction_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.auction_id = ?
    ORDER BY c.id DESC
");
$stmt->bind_param("i", $auction_id);
$stmt->execute();
$res = $stmt->get_result();

$comments = [];
while ($r = $res->fetch_assoc()) {
    $comments[] = $r;
}

echo json_encode([
    "status"            => "success",
    "data"              => $comments,
    "current_user_id"   => $current_user_id,
    "current_user_role" => $current_user_role,
    "can_moderate"      => in_array($current_user_role, ['admin', 'employee'], true)
]);
?>
