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

$sql = "
    SELECT
        fr.id,
        fr.sender_id,
        fr.receiver_id,
        fr.status,
        fr.created_at,
        u.name AS sender_name,
        u.email AS sender_email,
        u.profile_image AS sender_image
    FROM friend_requests fr
    JOIN users u ON u.id = fr.sender_id
    WHERE fr.receiver_id = ?
      AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = [
        "id" => intval($row["id"]),
        "sender_id" => intval($row["sender_id"]),
        "receiver_id" => intval($row["receiver_id"]),
        "status" => $row["status"],
        "created_at" => $row["created_at"],
        "sender_name" => $row["sender_name"],
        "sender_email" => $row["sender_email"],
        "sender_image" => $row["sender_image"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $requests
]);
?>