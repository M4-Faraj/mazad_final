<?php
header("Content-Type: application/json");

require_once "../config/db.php";

$auction_id = isset($_GET['auction_id']) ? intval($_GET['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid auction_id"
    ]);
    exit;
}

/*
  Remove inactive viewers after 30 seconds.
*/
$cleanup = $conn->prepare("
    DELETE FROM live_viewers
    WHERE auction_id = ?
    AND last_seen < DATE_SUB(NOW(), INTERVAL 30 SECOND)
");

if ($cleanup) {
    $cleanup->bind_param("i", $auction_id);
    $cleanup->execute();
}

$sql = "
    SELECT 
        lv.user_id,
        lv.joined_at,
        lv.last_seen,
        u.name,
        u.email,
        u.role,
        u.profile_image
    FROM live_viewers lv
    LEFT JOIN users u ON u.id = lv.user_id
    WHERE lv.auction_id = ?
    ORDER BY lv.joined_at ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $auction_id);
$stmt->execute();

$result = $stmt->get_result();
$viewers = [];

while ($row = $result->fetch_assoc()) {
    $viewers[] = [
        "user_id" => intval($row["user_id"]),
        "name" => $row["name"] ?: "User#" . $row["user_id"],
        "email" => $row["email"] ?: "",
        "role" => $row["role"] ?: "user",
        "profile_image" => $row["profile_image"] ?: null,
        "joined_at" => $row["joined_at"],
        "last_seen" => $row["last_seen"]
    ];
}

echo json_encode([
    "status" => "success",
    "count" => count($viewers),
    "data" => $viewers
]);
?>