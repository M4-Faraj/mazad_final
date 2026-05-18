<?php
session_start();
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "../config/db.php";
require_once "_notifications.php";
if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
    echo json_encode(["status" => "error", "message" => "not authorized"]);
    exit;
}

$role = $_SESSION['user_role'];
if ($role !== 'admin' && $role !== 'employee') {
    echo json_encode(["status" => "error", "message" => "insufficient privileges"]);
    exit;
}

if (!isset($_POST['auction_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing auction_id"]);
    exit;
}

$auction_id = intval($_POST['auction_id']);
$auctionBeforeUpdate = getAuctionInfo($conn, $auction_id);

if (!$auctionBeforeUpdate) {
    echo json_encode(["status" => "error", "message" => "Auction not found"]);
    exit;
}
$fields = [];
$types  = '';
$values = [];

$newEndTime = null;
$futureEndTime = false;

if (isset($_POST['title'])) {
    $fields[] = 'title = ?';
    $types .= 's';
    $values[] = $_POST['title'];
}

if (isset($_POST['description'])) {
    $fields[] = 'description = ?';
    $types .= 's';
    $values[] = $_POST['description'];
}

if (isset($_POST['category'])) {
    $category = strtolower(trim($_POST['category']));

    $categoryMap = [
        'fashion' => 'fashion',
        'electronics' => 'electronics',
        'art' => 'art',
        'watch' => 'watches',
        'watches' => 'watches',
        'cars' => 'cars',
        'car' => 'cars',
        'home' => 'home'
    ];

    if (!isset($categoryMap[$category])) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid category"
        ]);
        exit;
    }

    $fields[] = 'category = ?';
    $types .= 's';
    $values[] = $categoryMap[$category];
}

if (isset($_POST['current_price'])) {
    $fields[] = 'current_price = ?';
    $types .= 'd';
    $values[] = (float)$_POST['current_price'];
}

if (isset($_POST['end_time']) && trim($_POST['end_time']) !== '') {
    $newEndTime = trim($_POST['end_time']);

    $timeValue = strtotime($newEndTime);
    if ($timeValue === false) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid end time"
        ]);
        exit;
    }

    $futureEndTime = $timeValue > time();

    $fields[] = 'end_time = ?';
    $types .= 's';
    $values[] = date('Y-m-d H:i:s', $timeValue);
}

$finalStatus = null;

if (isset($_POST['status']) && trim($_POST['status']) !== '') {
    $rawStatus = strtolower(trim($_POST['status']));

    $statusMap = [
        'live' => 'approved',
        'active' => 'approved',
        'approved' => 'approved',
        'pending' => 'pending',
        'suspended' => 'suspended',
        'ended' => 'ended',
        'rejected' => 'rejected'
    ];

    if (!isset($statusMap[$rawStatus])) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid status"
        ]);
        exit;
    }

    $finalStatus = $statusMap[$rawStatus];
}

/*
  New rule:
  Any admin/employee change to auction end_time must send the auction
  back to pending review, even if the new date is in the future.

  Exceptions:
  - If admin explicitly chooses suspended or rejected, keep that status.
*/
if ($newEndTime !== null) {
    if ($finalStatus !== 'suspended' && $finalStatus !== 'rejected') {
        $finalStatus = 'pending';
    }
}
if ($finalStatus !== null) {
    $fields[] = 'status = ?';
    $types .= 's';
    $values[] = $finalStatus;
}

/*
  If end_time changed and auction is being sent back to pending,
  clear settlement/winner data so it can be reviewed and approved again cleanly.
*/
if ($newEndTime !== null && $finalStatus === 'pending') {
    $columnsToClear = [
        'settled_at' => 'NULL',
        'winner_user_id' => 'NULL',
        'winner_bid_amount' => 'NULL'
    ];

    foreach ($columnsToClear as $column => $valueSql) {
        $check = $conn->query("SHOW COLUMNS FROM auctions LIKE '$column'");
        if ($check && $check->num_rows > 0) {
            $fields[] = "$column = $valueSql";
        }
    }
}

if (empty($fields)) {
    echo json_encode(["status" => "error", "message" => "no fields to update"]);
    exit;
}

$sql = "UPDATE auctions SET " . implode(', ', $fields) . " WHERE id = ?";
$types .= 'i';
$values[] = $auction_id;

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => $conn->error]);
    exit;
}

$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    $message = "Your auction \"" . $auctionBeforeUpdate["title"] . "\" has been updated by admin.";

    if ($newEndTime !== null) {
        $message = "Your auction \"" . $auctionBeforeUpdate["title"] . "\" date/time was updated and is now pending review again.";
    }

    addNotification(
        $conn,
        intval($auctionBeforeUpdate["user_id"]),
        $newEndTime !== null ? "auction_time_updated" : "auction_updated",
        $newEndTime !== null ? "Auction date/time updated" : "Auction updated",
        $message,
        "profile.html#myAuctionsPanel",
        $auction_id
    );

    echo json_encode([
        "status" => "success",
        "auction_status" => $finalStatus
    ]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}
?>
