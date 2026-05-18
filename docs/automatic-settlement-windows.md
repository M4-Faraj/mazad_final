# Automatic Auction Settlement on Windows/XAMPP

Mazad settlement can run manually from the Admin panel, and automatically from Windows Task Scheduler.

The automatic runner is:

```bat
C:\xampp\php\php.exe C:\xampp\htdocs\mazad\scripts\run-settlement.php
```

If your project folder is uppercase:

```bat
C:\xampp\php\php.exe C:\xampp\htdocs\Mazad\scripts\run-settlement.php
```

## Manual Test

Open Command Prompt and run:

```bat
C:\xampp\php\php.exe C:\xampp\htdocs\mazad\scripts\run-settlement.php
```

Expected output is JSON with `status`, `server_now`, `eligible_count`, `settled_count`, `skipped_count`, and settled `items`.

## Task Scheduler Setup

1. Open Windows Task Scheduler.
2. Choose **Create Task**.
3. Name it `Mazad Auction Settlement`.
4. On **Triggers**, create a daily trigger.
5. In advanced trigger settings, set **Repeat task every** to `1 minute`.
6. Set duration to **Indefinitely**.
7. On **Actions**, choose **Start a Program**.
8. Program/script:

```bat
C:\xampp\php\php.exe
```

9. Add arguments:

```bat
C:\xampp\htdocs\mazad\scripts\run-settlement.php
```

10. Start in:

```bat
C:\xampp\htdocs\mazad
```

11. Make sure XAMPP MySQL is running.
12. Make sure `config/mail.local.php` exists for real winner/seller email sending.

The runner is safe to run every minute. Auctions are only settled when `settled_at` is `NULL`, so running it again does not duplicate winner saves, token awards, notifications, or emails.
