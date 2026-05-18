<?php
session_start();
header("Content-Type: application/json");

require_once "../config/db.php";

if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
    echo json_encode([
        "status" => "error",
        "message" => "not authorized"
    ]);
    exit;
}

$role = $_SESSION['user_role'];

if ($role !== "admin" && $role !== "employee") {
    echo json_encode([
        "status" => "error",
        "message" => "insufficient privileges"
    ]);
    exit;
}

$date = isset($_GET['date']) && $_GET['date'] !== ''
    ? $_GET['date']
    : date("Y-m-d");

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid date format"
    ]);
    exit;
}

function getCount($conn, $sql, $types = "", ...$params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) return 0;

    if ($types !== "") {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();

    return intval($row['total'] ?? 0);
}

function getValue($conn, $sql, $types = "", ...$params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) return 0;

    if ($types !== "") {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();

    return floatval($row['value'] ?? 0);
}

function buildDayReport($conn, $date) {
    $start = $date . " 00:00:00";
    $end   = $date . " 23:59:59";

    $totalAuctions = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM auctions WHERE created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $approvedAuctions = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM auctions WHERE status = 'approved' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $pendingAuctions = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM auctions WHERE status = 'pending' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $rejectedAuctions = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM auctions WHERE status = 'rejected' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $totalBids = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM bids WHERE created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $approvedBids = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM bids WHERE status = 'approved' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $pendingHighBids = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM bids WHERE status = 'pending' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $rejectedBids = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM bids WHERE status = 'rejected' AND created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $highestBid = getValue(
        $conn,
        "SELECT COALESCE(MAX(bid_amount), 0) AS value FROM bids WHERE created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    $newUsers = getCount(
        $conn,
        "SELECT COUNT(*) AS total FROM users WHERE created_at BETWEEN ? AND ?",
        "ss",
        $start,
        $end
    );

    return [
        "date" => $date,
        "total_auctions" => $totalAuctions,
        "approved_auctions" => $approvedAuctions,
        "pending_auctions" => $pendingAuctions,
        "rejected_auctions" => $rejectedAuctions,
        "total_bids" => $totalBids,
        "approved_bids" => $approvedBids,
        "pending_high_bids" => $pendingHighBids,
        "rejected_bids" => $rejectedBids,
        "highest_bid" => $highestBid,
        "new_users" => $newUsers
    ];
}

$selectedReport = buildDayReport($conn, $date);

$days = [];
for ($i = 0; $i < 7; $i++) {
    $day = date("Y-m-d", strtotime("-$i days"));
    $summary = buildDayReport($conn, $day);

    $days[] = [
        "date" => $day,
        "label" => $i === 0 ? "Today" : date("D, M d", strtotime($day)),
        "total_auctions" => $summary["total_auctions"],
        "total_bids" => $summary["total_bids"],
        "pending_high_bids" => $summary["pending_high_bids"],
        "new_users" => $summary["new_users"]
    ];
}

echo json_encode([
    "status" => "success",
    "selected_date" => $date,
    "report" => $selectedReport,
    "days" => $days
]);
?>