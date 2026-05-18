<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "./_stats.php";

$missing = ensureStatsSchema($conn);
if ($missing) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing required schema columns: " . implode(', ', $missing)
    ]);
    exit;
}

if(!isset($_SESSION['user_id'])){
    echo json_encode([
        "status" => "error",
        "message" => "not logged in"
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

$sql = "SELECT id, name, email, role, created_at,
           first_name, middle_name, last_name,
           age, birth_date, phone, city, bio, profile_image,
           COALESCE(tokens, 0) AS tokens,
           COALESCE(purchases_count, 0) AS purchases_count,
           COALESCE(sales_count, 0) AS sales_count,
           COALESCE(rank_score, 0) AS rank_score,
           COALESCE(rank_title, 'Bronze') AS rank_title,
           gender
        FROM users
        WHERE id = ?";;

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();
$user = $result->fetch_assoc();

echo json_encode([
    "status" => "success",
    "user" => $user
]);
