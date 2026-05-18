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

ensureNotificationsTable($conn);

$sql = "
    SELECT
        id,
        type,
        subject,
        body,
        link,
        is_read,
        auction_id,
        created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

$items = [];
$unread = 0;

while ($row = $result->fetch_assoc()) {
    if (intval($row["is_read"]) === 0) {
        $unread++;
    }

    $items[] = [
        "id" => intval($row["id"]),
        "type" => $row["type"] ?: "info",
        "title" => $row["subject"],
        "subject" => $row["subject"],
        "message" => $row["body"],
        "body" => $row["body"],
        "link" => $row["link"],
        "auction_id" => $row["auction_id"] ? intval($row["auction_id"]) : null,
        "is_read" => intval($row["is_read"]),
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "status" => "success",

    "unread" => $unread,
    "unread_count" => $unread,

    "data" => $items,
    "notifications" => $items
]);
?>