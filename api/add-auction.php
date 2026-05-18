<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "_notifications.php";
require_once "_stats.php";
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

if (!isset($_POST['title']) || !isset($_POST['description']) ||
    !isset($_POST['category']) || !isset($_POST['start_price']) ||
    !isset($_POST['current_price']) || !isset($_POST['auction_type'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

$missing = mazadMissingColumns($conn, [
    'auctions' => ['expected_final_price', 'max_acceptable_price'],
    'auction_images' => ['auction_id', 'file_path']
]);

if ($missing) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing required schema columns: " . implode(', ', $missing)
    ]);
    exit;
}

$user_id       = intval($_SESSION['user_id']);
$title         = trim($_POST['title']);
$description   = trim($_POST['description']);
$category      = trim($_POST['category']);
$image         = isset($_POST['image']) ? trim($_POST['image']) : '';
$start_price   = floatval($_POST['start_price']);
$current_price = floatval($_POST['current_price']);
$auction_type  = trim($_POST['auction_type']);
$end_time      = (isset($_POST['end_time']) && $_POST['end_time'] !== '') ? trim($_POST['end_time']) : null;

$expected_final_price = (isset($_POST['expected_final_price']) && $_POST['expected_final_price'] !== '')
    ? floatval($_POST['expected_final_price'])
    : null;

$max_acceptable_price = (isset($_POST['max_acceptable_price']) && $_POST['max_acceptable_price'] !== '')
    ? floatval($_POST['max_acceptable_price'])
    : null;

/*
  Auto rule:
  If seller enters expected price but leaves max empty,
  set max review threshold to 1.5x expected price.
*/
if ($expected_final_price !== null && $expected_final_price > 0 && ($max_acceptable_price === null || $max_acceptable_price <= 0)) {
    $max_acceptable_price = $expected_final_price * 1.5;
}

if ($start_price <= 0 || $current_price <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid price"]);
    exit;
}

if ($expected_final_price !== null && $expected_final_price > 0 && $expected_final_price < $start_price) {
    echo json_encode(["status" => "error", "message" => "Expected final price cannot be less than starting price"]);
    exit;
}

if ($max_acceptable_price !== null && $max_acceptable_price > 0) {
    $minAllowedMax = max($start_price, $expected_final_price ?? 0);
    if ($max_acceptable_price < $minAllowedMax) {
        echo json_encode(["status" => "error", "message" => "Max bid before review cannot be less than expected/start price"]);
        exit;
    }
}

$status = 'pending';

$stmt = $conn->prepare("
    INSERT INTO auctions
    (user_id, title, description, category, image, start_price, current_price, auction_type, status, end_time, expected_final_price, max_acceptable_price)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => $conn->error]);
    exit;
}

$stmt->bind_param(
    "issssddsssdd",
    $user_id,
    $title,
    $description,
    $category,
    $image,
    $start_price,
    $current_price,
    $auction_type,
    $status,
    $end_time,
    $expected_final_price,
    $max_acceptable_price
);

if ($stmt->execute()) {
    $auction_id = $stmt->insert_id;

    notifyStaff(
    $conn,
    "auction_pending",
    "New auction pending review",
    "A new auction has been added and needs approval: " . $title,
    "Admin.html",
    $auction_id
);

    $uploadedPaths = [];

    if (isset($_FILES['images'])) {
        $uploadDir    = __DIR__ . '/../images/auctions/';
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $maxFileSize  = 5 * 1024 * 1024;
        $maxFiles     = 6;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $files = $_FILES['images'];
        $countFiles = is_array($files['name']) ? min(count($files['name']), $maxFiles) : 0;

        for ($i = 0; $i < $countFiles; $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;

            $tmpName = $files['tmp_name'][$i];
            $origName = basename($files['name'][$i]);

            if (!is_uploaded_file($tmpName)) continue;
            if (filesize($tmpName) > $maxFileSize) continue;

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime  = finfo_file($finfo, $tmpName);
            finfo_close($finfo);

            if (!in_array($mime, $allowedTypes)) continue;

            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            $newName = time() . '_' . bin2hex(random_bytes(6)) . ($ext ? '.' . $ext : '');
            $target = $uploadDir . $newName;

            if (move_uploaded_file($tmpName, $target)) {
                $relPath = 'images/auctions/' . $newName;
                $uploadedPaths[] = $relPath;

                $imgStmt = $conn->prepare("INSERT INTO auction_images (auction_id, file_path) VALUES (?, ?)");
                if ($imgStmt) {
                    $imgStmt->bind_param("is", $auction_id, $relPath);
                    $imgStmt->execute();
                }
            }
        }
    }

    // Fallback: store main image field in auction_images
    if (empty($uploadedPaths) && !empty($image)) {
        $imgStmt = $conn->prepare("INSERT INTO auction_images (auction_id, file_path) VALUES (?, ?)");
        if ($imgStmt) {
            $imgStmt->bind_param("is", $auction_id, $image);
            $imgStmt->execute();
        }
    }

    echo json_encode([
        "status" => "success",
        "auction_id" => $auction_id,
        "images" => $uploadedPaths,
        "expected_final_price" => $expected_final_price,
        "max_acceptable_price" => $max_acceptable_price
    ]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>
