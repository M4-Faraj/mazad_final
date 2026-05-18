<?php
// CLI-only settlement runner for Windows Task Scheduler / cron.
// Safe to run every minute because settled_at prevents duplicate settlement and emails.

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'This settlement runner is CLI-only.'
    ], JSON_PRETTY_PRINT) . PHP_EOL;
    exit(1);
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../api/_stats.php';

function mazadSettlementCliSummary($result) {
    $items = [];
    foreach (($result['items'] ?? []) as $item) {
        $items[] = [
            'auction_id' => $item['auction_id'] ?? null,
            'winner_user_id' => $item['winner_user_id'] ?? null,
            'winner_bid_amount' => $item['winner_bid_amount'] ?? null,
            'winner_saved' => (bool)($item['winner_saved'] ?? false),
            'winner_mail_sent' => (bool)($item['winner_mail_sent'] ?? false),
            'seller_mail_sent' => (bool)($item['seller_mail_sent'] ?? false),
            'winner_mail_error' => $item['winner_mail_error'] ?? null,
            'seller_mail_error' => $item['seller_mail_error'] ?? null
        ];
    }

    return [
        'status' => $result['status'] ?? 'error',
        'server_now' => $result['server_now'] ?? null,
        'eligible_count' => (int)($result['eligible_count'] ?? 0),
        'settled_count' => (int)($result['settled_count'] ?? ($result['settled'] ?? 0)),
        'skipped_count' => (int)($result['skipped_count'] ?? 0),
        'items' => $items,
        'skipped' => $result['skipped'] ?? []
    ];
}

try {
    $missing = ensureStatsSchema($conn);
    if ($missing) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Missing required schema columns: ' . implode(', ', $missing),
            'eligible_count' => 0,
            'settled_count' => 0,
            'skipped_count' => 0,
            'items' => [],
            'skipped' => []
        ], JSON_PRETTY_PRINT) . PHP_EOL;
        exit(1);
    }

    $result = settleFinishedAuctions($conn);
    $summary = mazadSettlementCliSummary($result);

    echo json_encode($summary, JSON_PRETTY_PRINT) . PHP_EOL;
    exit(($summary['status'] ?? 'error') === 'success' ? 0 : 1);
} catch (Throwable $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Settlement runner failed',
        'error' => $e->getMessage(),
        'eligible_count' => 0,
        'settled_count' => 0,
        'skipped_count' => 0,
        'items' => [],
        'skipped' => []
    ], JSON_PRETTY_PRINT) . PHP_EOL;
    exit(1);
}
