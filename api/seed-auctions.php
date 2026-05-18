<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "./_stats.php";

ensureStatsSchema($conn);

if (php_sapi_name() !== 'cli') {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        echo json_encode(["status" => "error", "message" => "admin only"]);
        exit;
    }
}

$adminId = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 1;
$res = mysqli_query($conn, "SELECT id FROM users WHERE id = $adminId LIMIT 1");
if (!$res || mysqli_num_rows($res) === 0) {
    $r2 = mysqli_query($conn, "SELECT id FROM users ORDER BY id ASC LIMIT 1");
    if (!$r2 || mysqli_num_rows($r2) === 0) {
        echo json_encode(["status" => "error", "message" => "no users in db; create one first"]);
        exit;
    }
    $row = mysqli_fetch_assoc($r2);
    $adminId = (int)$row['id'];
}

$samples = [
    ["Vintage Leather Jacket",        "Hand-stitched 1970s biker jacket in mint condition.",            "Fashion",     "normal", 320,  450],
    ["Designer Silk Scarf Set",       "Three limited-edition silk scarves from a Milan capsule.",       "Fashion",     "live",   180,  240],
    ["MacBook Pro 16\" M3 Max",       "Sealed unit, 64GB unified memory, 2TB SSD.",                     "Electronics", "normal", 2800, 3150],
    ["Sony A7 IV Mirrorless Kit",     "Body + 24-70mm GM lens + extra battery + 128GB CFexpress.",      "Electronics", "live",   1900, 2100],
    ["Original Oil Painting",         "Signed contemporary abstract on canvas, 80x100cm, framed.",      "Art",         "normal", 600,  720],
    ["Antique Bronze Sculpture",      "Late 19th century bronze figure, 35cm height, with provenance.", "Art",         "normal", 950,  1080],
    ["Rolex Submariner 116610LN",     "Box and papers, full service history, 2018 production.",         "Watches",     "live",   8500, 9200],
    ["Omega Speedmaster Moonwatch",   "Manual-wind, hesalite crystal, recently serviced.",              "Watches",     "normal", 3700, 4050],
    ["1969 Ford Mustang Mach 1",      "Restored numbers-matching 351, 4-speed manual.",                 "Cars",        "normal", 42000,46500],
    ["Tesla Model S Plaid (2023)",    "Low mileage, full self-driving, ceramic coating.",               "Cars",        "live",   78000,82500],
    ["Mid-Century Walnut Sideboard",  "Danish modern, original brass pulls, fully restored.",           "Home",        "normal", 850,  990],
    ["Persian Tabriz Rug 3x4m",       "Hand-knotted silk-and-wool, certified antique.",                 "Home",        "normal", 2400, 2700],
];

$created = 0;
$endTimeNormal = date('Y-m-d H:i:s', time() + 7 * 24 * 3600);
$endTimeLive   = date('Y-m-d H:i:s', time() + 2 * 3600);

foreach ($samples as $s) {
    list($title, $desc, $cat, $type, $start, $current) = $s;

    $existsStmt = $conn->prepare("SELECT id FROM auctions WHERE title = ? LIMIT 1");
    $existsStmt->bind_param('s', $title);
    $existsStmt->execute();
    $exRes = $existsStmt->get_result();
    if ($exRes && $exRes->fetch_assoc()) continue;

    $endTime = ($type === 'live') ? $endTimeLive : $endTimeNormal;
    $status  = 'approved';

    $stmt = $conn->prepare("INSERT INTO auctions
        (user_id, title, description, category, image, start_price, current_price, auction_type, status, end_time)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)");
    $stmt->bind_param('isssddsss', $adminId, $title, $desc, $cat, $start, $current, $type, $status, $endTime);
    if ($stmt->execute()) $created++;
}

echo json_encode(["status" => "success", "created" => $created, "total_samples" => count($samples)]);
?>
