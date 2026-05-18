<?php
// Run settlement for finished auctions: awards tokens to buyer/seller.
// Accessible by admin web session or CLI (cron).
header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/_stats.php";

// Allow CLI execution
if (php_sapi_name() !== 'cli') {
    session_start();
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
        echo json_encode(["status" => "error", "message" => "not authorized"]);
        exit;
    }
    $role = $_SESSION['user_role'];
    if ($role !== 'admin' && $role !== 'employee') {
        echo json_encode(["status" => "error", "message" => "insufficient privileges"]);
        exit;
    }
}

try {
    $missing = ensureStatsSchema($conn);
    if ($missing) {
        echo json_encode([
            "status" => "error",
            "message" => "Missing required schema columns: " . implode(', ', $missing),
            "settled_count" => 0,
            "skipped_count" => 0,
            "items" => [],
            "skipped" => []
        ]);
        exit;
    }

    $res = settleFinishedAuctions($conn);
    echo json_encode($res);
} catch (Throwable $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Settlement failed",
        "error" => $e->getMessage(),
        "settled_count" => 0,
        "skipped_count" => 0,
        "items" => [],
        "skipped" => []
    ]);
}

?>
