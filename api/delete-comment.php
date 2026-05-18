<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

$user_id    = intval($_SESSION['user_id']);
$comment_id = isset($_POST['comment_id']) ? intval($_POST['comment_id']) : 0;

if ($comment_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid comment id"]);
    exit;
}

$uq = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
$uq->bind_param("i", $user_id);
$uq->execute();
$u = $uq->get_result()->fetch_assoc();

if (!$u) {
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

$role = strtolower((string)$u['role']);
$canModerate = in_array($role, ['admin', 'employee'], true);

$cq = $conn->prepare("SELECT id, auction_id, user_id, content FROM auction_comments WHERE id = ? LIMIT 1");
$cq->bind_param("i", $comment_id);
$cq->execute();
$comment = $cq->get_result()->fetch_assoc();

if (!$comment) {
    echo json_encode(["status" => "error", "message" => "Comment not found"]);
    exit;
}

$isAuthor = intval($comment['user_id']) === $user_id;

if (!$canModerate && !$isAuthor) {
    echo json_encode(["status" => "error", "message" => "Not authorized to delete this comment"]);
    exit;
}

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

$log = $conn->prepare("
    INSERT INTO comment_deletion_log
    (comment_id, auction_id, author_id, deleted_by, deleted_role, content_snapshot)
    VALUES (?, ?, ?, ?, ?, ?)
");
$cid   = intval($comment['id']);
$aid   = intval($comment['auction_id']);
$auth  = intval($comment['user_id']);
$body  = (string)$comment['content'];
$log->bind_param("iiiiss", $cid, $aid, $auth, $user_id, $role, $body);
$log->execute();

$del = $conn->prepare("DELETE FROM auction_comments WHERE id = ?");
$del->bind_param("i", $comment_id);

if (!$del->execute()) {
    echo json_encode(["status" => "error", "message" => $del->error]);
    exit;
}

echo json_encode([
    "status"     => "success",
    "comment_id" => $comment_id,
    "logged"     => true
]);
?>
