<?php

function mazadColumnExists($conn, $table, $column) {
    $tableName = mysqli_real_escape_string($conn, $table);
    $columnName = mysqli_real_escape_string($conn, $column);

    $checkSql = "SELECT COUNT(*) AS cnt
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = '$tableName'
                   AND COLUMN_NAME = '$columnName'";
    $result = mysqli_query($conn, $checkSql);
    $row = $result ? mysqli_fetch_assoc($result) : ['cnt' => 0];

    return (int)($row['cnt'] ?? 0) > 0;
}

function mazadMissingColumns($conn, $requirements) {
    $missing = [];

    foreach ($requirements as $table => $columns) {
        foreach ($columns as $column) {
            if (!mazadColumnExists($conn, $table, $column)) {
                $missing[] = "$table.$column";
            }
        }
    }

    return $missing;
}

function ensureStatsSchema($conn) {
    return mazadMissingColumns($conn, [
        'users' => [
            'birth_date', 'age', 'gender', 'first_name', 'middle_name',
            'last_name', 'phone', 'city', 'bio', 'profile_image',
            'tokens', 'purchases_count', 'sales_count', 'rank_score',
            'rank_title'
        ],
        'auctions' => ['winner_user_id', 'winner_bid_amount', 'settled_at']
    ]);
}

function rankTitleFromTokens($tokens) {
    $tokens = (int) $tokens;

    if ($tokens >= 1200) return 'Diamond';
    if ($tokens >= 700) return 'Platinum';
    if ($tokens >= 350) return 'Gold';
    if ($tokens >= 150) return 'Silver';
    return 'Bronze';
}

function updateUserRank($conn, $userId) {
    $userId = (int) $userId;
    $stmt = $conn->prepare("SELECT tokens, purchases_count, sales_count FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result ? $result->fetch_assoc() : null;

    if (!$user) return;

    $tokens = (int)($user['tokens'] ?? 0);
    $rankScore = $tokens;
    $rankTitle = rankTitleFromTokens($tokens);

    $update = $conn->prepare("UPDATE users SET rank_score = ?, rank_title = ? WHERE id = ?");
    $update->bind_param('isi', $rankScore, $rankTitle, $userId);
    $update->execute();
}

function awardUserTokens($conn, $userId, $tokenDelta, $purchaseDelta = 0, $saleDelta = 0) {
    $userId = (int) $userId;
    $tokenDelta = (int) $tokenDelta;
    $purchaseDelta = (int) $purchaseDelta;
    $saleDelta = (int) $saleDelta;

    $update = $conn->prepare("UPDATE users
        SET tokens = COALESCE(tokens,0) + ?,
            purchases_count = COALESCE(purchases_count,0) + ?,
            sales_count = COALESCE(sales_count,0) + ?
        WHERE id = ?");
    $update->bind_param('iiii', $tokenDelta, $purchaseDelta, $saleDelta, $userId);
    $update->execute();
    updateUserRank($conn, $userId);
}

function ensureSettlementNotificationsSchema($conn) {
    return mazadMissingColumns($conn, [
        'notifications' => ['link', 'auction_id', 'is_read', 'sent_email']
    ]);
}

function insertSettlementNotification($conn, $userId, $type, $subject, $body, $sentEmail, $auctionId, $link) {
    if (ensureSettlementNotificationsSchema($conn)) {
        return false;
    }

    $userId = (int)$userId;
    $auctionId = (int)$auctionId;
    $sentEmail = $sentEmail ? 1 : 0;

    $ins = $conn->prepare("INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link) VALUES (?, ?, ?, ?, ?, ?, ?)");
    if (!$ins) return false;

    $ins->bind_param('isssiis', $userId, $type, $subject, $body, $sentEmail, $auctionId, $link);
    if (!$ins->execute()) return false;
    return (int)$ins->insert_id;
}

function updateSettlementNotificationEmailStatus($conn, $notificationId, $sentEmail) {
    $notificationId = (int)$notificationId;
    if ($notificationId <= 0 || ensureSettlementNotificationsSchema($conn)) {
        return false;
    }

    $sentEmail = $sentEmail ? 1 : 0;
    $stmt = $conn->prepare("UPDATE notifications SET sent_email = ? WHERE id = ?");
    if (!$stmt) return false;
    $stmt->bind_param('ii', $sentEmail, $notificationId);
    return $stmt->execute();
}

function mazadWinnerEmailHtml($name, $title, $amount, $detailsUrl) {
    $nameSafe   = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $titleSafe  = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
    $urlSafe    = htmlspecialchars($detailsUrl, ENT_QUOTES, 'UTF-8');

    return '<!DOCTYPE html><html><body style="font-family:Manrope,Arial,sans-serif;background:#0b0f1a;color:#eee;padding:24px">
      <div style="max-width:560px;margin:auto;background:#11151f;border:1px solid rgba(212,175,55,.25);border-radius:16px;padding:32px">
        <h1 style="margin:0 0 4px;font-family:Bebas Neue,Arial,sans-serif;letter-spacing:2px;color:#d4af37">MAZAD</h1>
        <p style="margin:0 0 22px;color:#9aa3b2;font-size:.85rem;letter-spacing:.5px">Premium Auction House</p>

        <h2 style="margin:0 0 14px;color:#f5e29d">Congratulations, ' . $nameSafe . ' 🏆</h2>
        <p style="color:#cfcfd4;line-height:1.65;margin:0 0 18px">
          You won the auction <b style="color:#fff">' . $titleSafe . '</b> with the highest bid.
        </p>

        <div style="background:#0b0f1a;border:1px solid rgba(212,175,55,.2);border-radius:12px;padding:18px;text-align:center;margin:8px 0 18px">
          <div style="color:#9aa3b2;font-size:.78rem;letter-spacing:.5px;text-transform:uppercase">Winning bid</div>
          <div style="color:#d4af37;font-size:28px;font-weight:800;margin-top:4px">' . $amountSafe . '</div>
        </div>

        <p style="color:#cfcfd4;line-height:1.65;margin:0 0 22px">
          We have credited <b style="color:#f5e29d">20 credibility tokens</b> to your account — check your profile to see your updated rank.
        </p>

        <a href="' . $urlSafe . '" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#f5e29d,#d4af37);color:#1a140a;font-weight:800;text-decoration:none">
          View auction
        </a>

        <p style="color:#7d7d85;font-size:12px;margin-top:28px;line-height:1.55">
          Reply to this email if anything looks wrong — our team will help arrange next steps with the seller.
        </p>
      </div>
    </body></html>';
}

function mazadSellerEmailHtml($sellerName, $title, $winnerName, $amount, $detailsUrl) {
    $sellerSafe = htmlspecialchars($sellerName, ENT_QUOTES, 'UTF-8');
    $titleSafe  = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $winnerSafe = htmlspecialchars($winnerName, ENT_QUOTES, 'UTF-8');
    $amountSafe = htmlspecialchars($amount, ENT_QUOTES, 'UTF-8');
    $urlSafe    = htmlspecialchars($detailsUrl, ENT_QUOTES, 'UTF-8');

    return '<!DOCTYPE html><html><body style="font-family:Manrope,Arial,sans-serif;background:#0b0f1a;color:#eee;padding:24px">
      <div style="max-width:560px;margin:auto;background:#11151f;border:1px solid rgba(212,175,55,.25);border-radius:16px;padding:32px">
        <h1 style="margin:0 0 4px;font-family:Bebas Neue,Arial,sans-serif;letter-spacing:2px;color:#d4af37">MAZAD</h1>
        <p style="margin:0 0 22px;color:#9aa3b2;font-size:.85rem;letter-spacing:.5px">Premium Auction House</p>

        <h2 style="margin:0 0 14px;color:#f5e29d">Auction ended successfully</h2>
        <p style="color:#cfcfd4;line-height:1.65;margin:0 0 18px">
          Hi ' . $sellerSafe . ', your auction <b style="color:#fff">' . $titleSafe . '</b> ended successfully.
        </p>

        <div style="background:#0b0f1a;border:1px solid rgba(212,175,55,.2);border-radius:12px;padding:18px;margin:8px 0 18px">
          <div style="color:#9aa3b2;font-size:.78rem;letter-spacing:.5px;text-transform:uppercase">Winning bidder</div>
          <div style="color:#fff;font-size:20px;font-weight:800;margin-top:4px">' . $winnerSafe . '</div>
          <div style="color:#9aa3b2;font-size:.78rem;letter-spacing:.5px;text-transform:uppercase;margin-top:14px">Winning bid</div>
          <div style="color:#d4af37;font-size:28px;font-weight:800;margin-top:4px">' . $amountSafe . '</div>
        </div>

        <p style="color:#cfcfd4;line-height:1.65;margin:0 0 22px">
          We have credited <b style="color:#f5e29d">50 credibility tokens</b> to your account for this completed sale.
        </p>

        <a href="' . $urlSafe . '" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#f5e29d,#d4af37);color:#1a140a;font-weight:800;text-decoration:none">
          View auction
        </a>
      </div>
    </body></html>';
}

function sendWinnerEmail($conn, $winnerId, $auctionId, $winnerAmount) {
    require_once __DIR__ . '/_mailer.php';

    $stmt = $conn->prepare("SELECT u.email, u.name, a.title
                              FROM users u
                              JOIN auctions a ON a.id = ?
                             WHERE u.id = ? LIMIT 1");
    $stmt->bind_param('ii', $auctionId, $winnerId);
    $stmt->execute();
    $r = $stmt->get_result();
    $row = $r ? $r->fetch_assoc() : null;
    if (!$row || empty($row['email'])) {
        $name = $row['name'] ?? 'Bidder';
        $title = $row['title'] ?? ('Auction #' . $auctionId);
        $amount = '$' . number_format((float)$winnerAmount, 2);
        $detailsLink = 'auction-details.html?id=' . (int)$auctionId;
        $subjectPlain = "You won the auction: $title";
        $text = "Hi $name,\n\n"
              . "Congratulations — you won the Mazad auction \"$title\" with a winning bid of $amount.\n\n"
              . "We've credited 20 credibility tokens to your account.\n"
              . "Auction: http://localhost/mazad/$detailsLink\n\n"
              . "— Mazad Auction House";
        $notificationId = $row
            ? insertSettlementNotification($conn, $winnerId, 'auction_won', $subjectPlain, $text, false, $auctionId, $detailsLink)
            : false;

        return [
            'sent' => false,
            'email' => $row['email'] ?? null,
            'error' => 'missing winner email',
            'notification_id' => $notificationId ?: null
        ];
    }

    $to     = $row['email'];
    $name   = $row['name'] ?: 'Bidder';
    $title  = $row['title'] ?: ('Auction #' . $auctionId);
    $amount = '$' . number_format((float)$winnerAmount, 2);
    $detailsUrl = 'http://localhost/mazad/auction-details.html?id=' . (int)$auctionId;
    $detailsLink = 'auction-details.html?id=' . (int)$auctionId;

    $subjectPlain = "You won the auction: $title";
    $html = mazadWinnerEmailHtml($name, $title, $amount, $detailsUrl);
    $text = "Hi $name,\n\n"
          . "Congratulations — you won the Mazad auction \"$title\" with a winning bid of $amount.\n\n"
          . "We've credited 20 credibility tokens to your account.\n"
          . "Auction: $detailsUrl\n\n"
          . "— Mazad Auction House";

    $notificationId = insertSettlementNotification($conn, $winnerId, 'auction_won', $subjectPlain, $text, false, $auctionId, $detailsLink);
    [$sent, $log] = mazad_send_mail($to, $name, $subjectPlain, $html, $text);
    updateSettlementNotificationEmailStatus($conn, $notificationId, $sent);

    return [
        'sent' => (bool)$sent,
        'email' => $to,
        'error' => $sent ? null : $log,
        'notification_id' => $notificationId ?: null
    ];
}

function sendSellerEmail($conn, $sellerId, $winnerId, $auctionId, $winnerAmount) {
    require_once __DIR__ . '/_mailer.php';

    $stmt = $conn->prepare("SELECT
                                seller.email AS seller_email,
                                seller.name AS seller_name,
                                winner.name AS winner_name,
                                a.title
                              FROM auctions a
                              JOIN users seller ON seller.id = a.user_id
                              JOIN users winner ON winner.id = ?
                             WHERE a.id = ? AND seller.id = ?
                             LIMIT 1");
    $stmt->bind_param('iii', $winnerId, $auctionId, $sellerId);
    $stmt->execute();
    $r = $stmt->get_result();
    $row = $r ? $r->fetch_assoc() : null;
    if (!$row || empty($row['seller_email'])) {
        $sellerName = $row['seller_name'] ?? 'Seller';
        $winnerName = $row['winner_name'] ?? 'Winning bidder';
        $title = $row['title'] ?? ('Auction #' . $auctionId);
        $amount = '$' . number_format((float)$winnerAmount, 2);
        $detailsLink = 'auction-details.html?id=' . (int)$auctionId;
        $subjectPlain = "Your auction sold: $title";
        $text = "Hi $sellerName,\n\n"
              . "Your Mazad auction \"$title\" ended successfully.\n\n"
              . "Winning bidder: $winnerName\n"
              . "Winning bid: $amount\n\n"
              . "We've credited 50 credibility tokens to your account for this sale.\n"
              . "Auction: http://localhost/mazad/$detailsLink\n\n"
              . "— Mazad Auction House";
        $notificationId = $row
            ? insertSettlementNotification($conn, $sellerId, 'auction_sold', $subjectPlain, $text, false, $auctionId, $detailsLink)
            : false;

        return [
            'sent' => false,
            'email' => $row['seller_email'] ?? null,
            'error' => 'missing seller email',
            'notification_id' => $notificationId ?: null
        ];
    }

    $to = $row['seller_email'];
    $sellerName = $row['seller_name'] ?: 'Seller';
    $winnerName = $row['winner_name'] ?: 'Winning bidder';
    $title = $row['title'] ?: ('Auction #' . $auctionId);
    $amount = '$' . number_format((float)$winnerAmount, 2);
    $detailsUrl = 'http://localhost/mazad/auction-details.html?id=' . (int)$auctionId;
    $detailsLink = 'auction-details.html?id=' . (int)$auctionId;

    $subjectPlain = "Your auction sold: $title";
    $html = mazadSellerEmailHtml($sellerName, $title, $winnerName, $amount, $detailsUrl);
    $text = "Hi $sellerName,\n\n"
          . "Your Mazad auction \"$title\" ended successfully.\n\n"
          . "Winning bidder: $winnerName\n"
          . "Winning bid: $amount\n\n"
          . "We've credited 50 credibility tokens to your account for this sale.\n"
          . "Auction: $detailsUrl\n\n"
          . "— Mazad Auction House";

    $notificationId = insertSettlementNotification($conn, $sellerId, 'auction_sold', $subjectPlain, $text, false, $auctionId, $detailsLink);
    [$sent, $log] = mazad_send_mail($to, $sellerName, $subjectPlain, $html, $text);
    updateSettlementNotificationEmailStatus($conn, $notificationId, $sent);

    return [
        'sent' => (bool)$sent,
        'email' => $to,
        'error' => $sent ? null : $log,
        'notification_id' => $notificationId ?: null
    ];
}

function insertTokenLedgerSafe($conn, $userId, $delta, $reason, $auctionId) {
    $stmt = $conn->prepare("INSERT INTO token_ledger (user_id, delta, reason, auction_id) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        return ['ok' => false, 'error' => $conn->error];
    }

    $userId = (int)$userId;
    $delta = (int)$delta;
    $auctionId = (int)$auctionId;
    $stmt->bind_param('iisi', $userId, $delta, $reason, $auctionId);
    return ['ok' => $stmt->execute(), 'error' => $stmt->error ?: null];
}

function settleFinishedAuctions($conn) {
    $missing = ensureStatsSchema($conn);
    if ($missing) {
        return [
            "status" => "error",
            "message" => "Missing required schema columns: " . implode(', ', $missing),
            "settled_count" => 0,
            "skipped_count" => 0,
            "items" => [],
            "skipped" => []
        ];
    }

    $serverNow = null;
    $nowResult = mysqli_query($conn, "SELECT NOW() AS server_now");
    if ($nowResult) {
        $nowRow = mysqli_fetch_assoc($nowResult);
        $serverNow = $nowRow['server_now'] ?? null;
    }

    $sql = "SELECT id, title, user_id, current_price, start_price, status, end_time
            FROM auctions
            WHERE settled_at IS NULL
              AND end_time IS NOT NULL
              AND end_time <> '0000-00-00 00:00:00'
              AND end_time <= NOW()
              AND LOWER(status) IN ('approved', 'live', 'active', 'ended', 'closed')
            ORDER BY id ASC";

    $result = mysqli_query($conn, $sql);
    if (!$result) {
        return [
            "status" => "error",
            "message" => mysqli_error($conn),
            "server_now" => $serverNow,
            "eligible_count" => 0,
            "settled_count" => 0,
            "skipped_count" => 0,
            "items" => [],
            "skipped" => []
        ];
    }

    $eligibleCount = mysqli_num_rows($result);
    $settled = 0;
    $items = [];
    $skipped = [];

    while ($auction = mysqli_fetch_assoc($result)) {
        $auctionId = (int) $auction['id'];
        $sellerId = (int) $auction['user_id'];
        $title = $auction['title'] ?: ('Auction #' . $auctionId);

        $bidSql = $conn->prepare("
            SELECT b.id, b.user_id, b.bid_amount, u.email AS winner_email, u.name AS winner_name
              FROM bids b
              LEFT JOIN users u ON u.id = b.user_id
             WHERE b.auction_id = ?
               AND b.status = 'approved'
             ORDER BY b.bid_amount DESC, b.id DESC
            LIMIT 1
        ");
        if (!$bidSql) {
            $skipped[] = [
                'auction_id' => $auctionId,
                'title' => $title,
                'reason' => 'winner query prepare failed',
                'error' => $conn->error
            ];
            continue;
        }

        $bidSql->bind_param('i', $auctionId);
        $bidSql->execute();
        $bidResult = $bidSql->get_result();
        $topBid = $bidResult ? $bidResult->fetch_assoc() : null;

        if (!$topBid) {
            $skipped[] = [
                'auction_id' => $auctionId,
                'title' => $title,
                'reason' => 'no approved bids'
            ];
            continue;
        }

        $winnerId = (int) $topBid['user_id'];
        $winnerAmount = (float) $topBid['bid_amount'];

        $updateAuction = $conn->prepare("UPDATE auctions
            SET status = 'ended',
                winner_user_id = ?,
                winner_bid_amount = ?,
                current_price = ?,
                settled_at = NOW()
            WHERE id = ? AND settled_at IS NULL");
        if (!$updateAuction) {
            $skipped[] = [
                'auction_id' => $auctionId,
                'title' => $title,
                'winner_user_id' => $winnerId,
                'winner_bid_amount' => $winnerAmount,
                'reason' => 'auction update prepare failed',
                'error' => $conn->error
            ];
            continue;
        }

        $updateAuction->bind_param('iddi', $winnerId, $winnerAmount, $winnerAmount, $auctionId);
        $updated = $updateAuction->execute();

        if (!$updated || $updateAuction->affected_rows < 1) {
            $skipped[] = [
                'auction_id' => $auctionId,
                'title' => $title,
                'winner_user_id' => $winnerId,
                'winner_bid_amount' => $winnerAmount,
                'reason' => $updated ? 'already settled or no row updated' : 'auction update failed',
                'error' => $updateAuction->error ?: null
            ];
            continue;
        }

        $sellerRow = null;
        $sellerStmt = $conn->prepare("SELECT email, name FROM users WHERE id = ? LIMIT 1");
        if ($sellerStmt) {
            $sellerStmt->bind_param('i', $sellerId);
            $sellerStmt->execute();
            $sellerResult = $sellerStmt->get_result();
            $sellerRow = $sellerResult ? $sellerResult->fetch_assoc() : null;
        }

        $winnerTokensAwarded = false;
        $sellerTokensAwarded = false;
        $winnerLedger = null;
        $sellerLedger = null;

        try {
            awardUserTokens($conn, $winnerId, 20, 1, 0);
            $winnerTokensAwarded = true;
            $winnerLedger = insertTokenLedgerSafe($conn, $winnerId, 20, 'Purchase completed', $auctionId);
        } catch (Throwable $e) {
            $winnerLedger = ['ok' => false, 'error' => $e->getMessage()];
        }

        if ($sellerId) {
            try {
                awardUserTokens($conn, $sellerId, 50, 0, 1);
                $sellerTokensAwarded = true;
                $sellerLedger = insertTokenLedgerSafe($conn, $sellerId, 50, 'Sale completed', $auctionId);
            } catch (Throwable $e) {
                $sellerLedger = ['ok' => false, 'error' => $e->getMessage()];
            }
        }

        $winnerMail = sendWinnerEmail($conn, $winnerId, $auctionId, $winnerAmount);
        $sellerMail = $sellerId
            ? sendSellerEmail($conn, $sellerId, $winnerId, $auctionId, $winnerAmount)
            : ['sent' => false, 'email' => null, 'error' => 'missing seller id', 'notification_id' => null];

        $items[] = [
            'auction_id' => $auctionId,
            'title' => $title,
            'winner_user_id' => $winnerId,
            'winner_bid_amount' => $winnerAmount,
            'winner_saved' => true,
            'status_saved' => 'ended',
            'settled_at_saved' => true,
            'seller_user_id' => $sellerId,
            'winner_email' => $winnerMail['email'] ?? ($topBid['winner_email'] ?? null),
            'seller_email' => $sellerMail['email'] ?? ($sellerRow['email'] ?? null),
            'winner_mail_sent' => (bool)($winnerMail['sent'] ?? false),
            'seller_mail_sent' => (bool)($sellerMail['sent'] ?? false),
            'winner_mail_error' => $winnerMail['error'] ?? null,
            'seller_mail_error' => $sellerMail['error'] ?? null,
            'winner_notification_id' => $winnerMail['notification_id'] ?? null,
            'seller_notification_id' => $sellerMail['notification_id'] ?? null,
            'winner_tokens_awarded' => $winnerTokensAwarded,
            'seller_tokens_awarded' => $sellerTokensAwarded,
            'winner_ledger' => $winnerLedger,
            'seller_ledger' => $sellerLedger
        ];

        $settled++;
    }

    return [
        "status" => "success",
        "server_now" => $serverNow,
        "eligible_count" => $eligibleCount,
        "settled_count" => $settled,
        "settled" => $settled,
        "skipped_count" => count($skipped),
        "items" => $items,
        "skipped" => $skipped
    ];
}
