<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

$user_id = intval($_SESSION['user_id']);
$auction_id = isset($_POST['auction_id']) ? intval($_POST['auction_id']) : 0;

if ($auction_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid auction id"]);
    exit;
}

$uq = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
$uq->bind_param("i", $user_id);
$uq->execute();
$u = $uq->get_result()->fetch_assoc();

if (!$u || !in_array(strtolower((string)$u['role']), ['admin', 'employee'], true)) {
    echo json_encode(["status" => "error", "message" => "Admins or employees only"]);
    exit;
}

/* Ensure showcase columns exist */
$checkShowcase = mysqli_query($conn, "SHOW COLUMNS FROM auctions LIKE 'category_showcase'");
if ($checkShowcase && mysqli_num_rows($checkShowcase) === 0) {
    mysqli_query($conn, "ALTER TABLE auctions ADD COLUMN category_showcase TINYINT(1) NOT NULL DEFAULT 0");
}

$checkOrder = mysqli_query($conn, "SHOW COLUMNS FROM auctions LIKE 'showcase_order'");
if ($checkOrder && mysqli_num_rows($checkOrder) === 0) {
    mysqli_query($conn, "ALTER TABLE auctions ADD COLUMN showcase_order INT NOT NULL DEFAULT 0");
}

$cur = $conn->prepare("
    SELECT id, title, category, status, category_showcase
    FROM auctions
    WHERE id = ?
    LIMIT 1
");
$cur->bind_param("i", $auction_id);
$cur->execute();
$row = $cur->get_result()->fetch_assoc();

if (!$row) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}

$new = intval($row['category_showcase']) === 1 ? 0 : 1;
$order = 0;

if ($new === 1) {
    $category = $row['category'];

    $orderStmt = $conn->prepare("
        SELECT COALESCE(MAX(showcase_order), 0) + 1 AS next_order
        FROM auctions
        WHERE category = ? AND category_showcase = 1
    ");
    $orderStmt->bind_param("s", $category);
    $orderStmt->execute();
    $orderRow = $orderStmt->get_result()->fetch_assoc();

    $order = intval($orderRow['next_order'] ?? 1);
}

$upd = $conn->prepare("
    UPDATE auctions
    SET category_showcase = ?, showcase_order = ?
    WHERE id = ?
");
$upd->bind_param("iii", $new, $order, $auction_id);

if ($upd->execute()) {
    echo json_encode([
        "status" => "success",
        "auction_id" => $auction_id,
        "category_showcase" => $new === 1,
        "showcase_order" => $order
    ]);
} else {
    echo json_encode(["status" => "error", "message" => $upd->error]);
}
?>