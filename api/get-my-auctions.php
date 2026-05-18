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
        id,
        title,
        description,
        category,
        auction_type,
        featured,
        start_price,
        current_price,
        status,
        image,
        created_at,
        end_time
    FROM auctions
    WHERE user_id = ?
    ORDER BY created_at DESC
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

$auctions = [];

while ($row = $result->fetch_assoc()) {
    $auctions[] = [
        "id" => intval($row["id"]),
        "title" => $row["title"],
        "description" => $row["description"],
        "category" => $row["category"],
        "auction_type" => $row["auction_type"],
        "featured" => intval($row["featured"]),
        "start_price" => floatval($row["start_price"]),
        "current_price" => floatval($row["current_price"]),
        "status" => $row["status"],
        "image" => $row["image"],
        "created_at" => $row["created_at"],
        "end_time" => $row["end_time"]
    ];
}

echo json_encode([
    "status" => "success",
    "data" => $auctions
]);
?>