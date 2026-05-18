<?php
function ensureNotificationsTable($conn) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            link VARCHAR(255) DEFAULT NULL,
            auction_id INT DEFAULT NULL,
            is_read TINYINT(1) DEFAULT 0,
            sent_email TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
}

function addNotification($conn, $user_id, $type, $subject, $body, $link = null, $auction_id = null) {
    ensureNotificationsTable($conn);

    $user_id = intval($user_id);
    $sent_email = 0;
    $auction_id = $auction_id !== null ? intval($auction_id) : null;

    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, type, subject, body, sent_email, auction_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param(
        "isssiis",
        $user_id,
        $type,
        $subject,
        $body,
        $sent_email,
        $auction_id,
        $link
    );

    return $stmt->execute();
}

function notifyStaff($conn, $type, $subject, $body, $link = "Admin.html", $auction_id = null) {
    ensureNotificationsTable($conn);

    $users = $conn->query("
        SELECT id
        FROM users
        WHERE role IN ('admin', 'employee')
    ");

    if (!$users) {
        return false;
    }

    while ($row = $users->fetch_assoc()) {
        addNotification(
            $conn,
            intval($row["id"]),
            $type,
            $subject,
            $body,
            $link,
            $auction_id
        );
    }

    return true;
}

function notifyAllUsersExcept($conn, $except_user_id, $type, $subject, $body, $link = null, $auction_id = null) {
    ensureNotificationsTable($conn);

    $except_user_id = intval($except_user_id);

    $users = $conn->query("
        SELECT id
        FROM users
        WHERE id != $except_user_id
    ");

    if (!$users) {
        return false;
    }

    while ($row = $users->fetch_assoc()) {
        addNotification(
            $conn,
            intval($row["id"]),
            $type,
            $subject,
            $body,
            $link,
            $auction_id
        );
    }

    return true;
}

function notifyAuctionOwner($conn, $auction_id, $type, $subject, $body, $link = null) {
    ensureNotificationsTable($conn);

    $auction_id = intval($auction_id);

    $stmt = $conn->prepare("
        SELECT user_id
        FROM auctions
        WHERE id = ?
        LIMIT 1
    ");

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("i", $auction_id);
    $stmt->execute();

    $auction = $stmt->get_result()->fetch_assoc();

    if (!$auction) {
        return false;
    }

    return addNotification(
        $conn,
        intval($auction["user_id"]),
        $type,
        $subject,
        $body,
        $link,
        $auction_id
    );
}

function getAuctionInfo($conn, $auction_id) {
    $auction_id = intval($auction_id);

    $stmt = $conn->prepare("
        SELECT id, user_id, title
        FROM auctions
        WHERE id = ?
        LIMIT 1
    ");

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param("i", $auction_id);
    $stmt->execute();

    return $stmt->get_result()->fetch_assoc();
}
?>