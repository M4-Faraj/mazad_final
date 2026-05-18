<?php
// Migration helper: ensures schema for tokens/ranks exists.
// Can be run from CLI or by an admin in the web UI.
header("Content-Type: application/json");
require_once "../config/db.php";
require_once "./_stats.php";

// Allow CLI execution without session
if (php_sapi_name() !== 'cli') {
    session_start();
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        echo json_encode(["status" => "error", "message" => "not authorized"]);
        exit;
    }
}

ensureStatsSchema($conn);

echo json_encode(["status" => "success", "message" => "schema ensured"]);

?>
