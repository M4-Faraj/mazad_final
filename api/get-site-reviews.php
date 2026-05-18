<?php
header("Content-Type: application/json");

require_once "../config/db.php";

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 4;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

if ($limit <= 0) {
    $limit = 4;
}

if ($offset < 0) {
    $offset = 0;
}

$countResult = mysqli_query($conn, "SELECT COUNT(*) AS total FROM site_reviews");
$countRow = mysqli_fetch_assoc($countResult);
$total = intval($countRow['total'] ?? 0);

$sql = "
    SELECT 
        sr.id,
        sr.content,
        sr.created_at,
        u.name AS user_name
    FROM site_reviews sr
    JOIN users u ON sr.user_id = u.id
    ORDER BY sr.created_at DESC
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $limit, $offset);
$stmt->execute();

$result = $stmt->get_result();

$reviews = [];

while ($row = $result->fetch_assoc()) {
    $reviews[] = [
        "id" => intval($row["id"]),
        "user_name" => $row["user_name"],
        "content" => $row["content"],
        "created_at" => $row["created_at"]
    ];
}

echo json_encode([
    "status" => "success",
    "total" => $total,
    "reviews" => $reviews
]);
?>