<?php
session_start();
header("Content-Type: application/json");
require_once "../../config/db.php";
require_once "../_stats.php";

$missing = array_merge(
    ensureStatsSchema($conn),
    mazadMissingColumns($conn, [
        'auctions' => [
            'expected_final_price', 'max_acceptable_price', 'featured',
            'category_showcase', 'showcase_order'
        ],
        'users' => ['tokens', 'rank_title', 'sales_count'],
        'auction_images' => ['file_path']
    ])
);

if ($missing) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing required schema columns: " . implode(', ', array_unique($missing))
    ]);
    exit;
}

$isAdmin = isset($_SESSION['user_role']) && strtolower((string)$_SESSION['user_role']) === 'admin';
$requestedAdmin = isset($_GET['context']) && $_GET['context'] === 'admin';
$requestedAdmin = $requestedAdmin || (isset($_GET['admin']) && $_GET['admin'] === '1');
$adminMode = $isAdmin && $requestedAdmin;

$requestedId = isset($_GET['id']) ? intval($_GET['id']) : 0;
$includeEndedDetail = !$adminMode
    && $requestedId > 0
    && isset($_GET['include_ended'])
    && $_GET['include_ended'] === '1';

$activeTimeWhere = "(a.end_time IS NULL OR a.end_time = '0000-00-00 00:00:00' OR a.end_time > NOW())";

if ($adminMode) {
    $where = "WHERE ($activeTimeWhere OR a.end_time >= DATE_SUB(NOW(), INTERVAL 10 DAY))";
} elseif ($includeEndedDetail) {
    $where = "WHERE a.status = 'approved' AND a.id = $requestedId";
} else {
    $where = "WHERE a.status = 'approved' AND $activeTimeWhere";
}

$sql = "SELECT a.*,
               COALESCE(a.expected_final_price, 0) AS expected_final_price,
               COALESCE(a.max_acceptable_price, 0) AS max_acceptable_price,
               COALESCE(a.featured, 0) AS featured,
               COALESCE(a.category_showcase, 0) AS category_showcase,
               COALESCE(a.showcase_order, 0) AS showcase_order,
               u.name AS seller,
               COALESCE(u.tokens, 0) AS seller_tokens,
               COALESCE(u.rank_title, 'Bronze') AS seller_rank,
               COALESCE(u.sales_count, 0) AS seller_sales
          FROM auctions a
          LEFT JOIN users u ON u.id = a.user_id
         $where
         ORDER BY a.category_showcase DESC, a.showcase_order ASC, a.id DESC";

$result = mysqli_query($conn, $sql);

if (!$result) {
    echo json_encode([
        "status" => "error",
        "message" => mysqli_error($conn)
    ]);
    exit;
}

$auctions = [];

while ($row = mysqli_fetch_assoc($result)) {
    $auction_id = intval($row['id']);
    $images = [];

    $imgSql = "SELECT file_path FROM auction_images WHERE auction_id = $auction_id";
    $imgRes = @mysqli_query($conn, $imgSql);

    if ($imgRes) {
        while ($ir = mysqli_fetch_assoc($imgRes)) {
            $images[] = $ir['file_path'];
        }
    }

    $row['images'] = $images;
    $auctions[] = $row;
}

echo json_encode([
    "status" => "success",
    "data" => $auctions
]);
?>
