<?php
// Loader: reads SMTP credentials from config/mail.local.php (gitignored).
// If that file is missing, email sending is disabled gracefully.

$local = __DIR__ . '/mail.local.php';

if (!file_exists($local)) {
    return [
        'enabled' => false,
        'error' => 'Missing config/mail.local.php; email sending is disabled.'
    ];
}

return require $local;
