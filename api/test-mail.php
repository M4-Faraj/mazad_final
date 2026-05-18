<?php
// Diagnostic endpoint — open in browser to test SMTP step by step.
// DELETE THIS FILE before going to production.
header("Content-Type: text/plain; charset=utf-8");

echo "=== PHP / SMTP diagnostic ===\n";
echo "PHP version: " . PHP_VERSION . "\n";
echo "OpenSSL extension loaded: " . (extension_loaded('openssl') ? 'YES' : 'NO  <-- this MUST be YES') . "\n";
echo "Available stream transports: " . implode(', ', stream_get_transports()) . "\n";
echo "  ssl:// available: " . (in_array('ssl', stream_get_transports()) ? 'YES' : 'NO') . "\n";
echo "  tls:// available: " . (in_array('tls', stream_get_transports()) ? 'YES' : 'NO') . "\n";
echo "\n";

$cfg = require __DIR__ . '/../config/mail.php';
echo "SMTP host: {$cfg['smtp_host']}:{$cfg['smtp_port']}\n";
echo "SMTP user: {$cfg['smtp_user']}\n";
echo "SMTP pass length: " . strlen($cfg['smtp_pass']) . " chars (expected 16 for Gmail app password)\n";
echo "\n--- attempting connection ---\n";

$errno = 0; $errstr = '';
$transport = ($cfg['smtp_port'] == 465) ? 'ssl://' : '';
$socket = @stream_socket_client(
    $transport . $cfg['smtp_host'] . ':' . $cfg['smtp_port'],
    $errno, $errstr, 15,
    STREAM_CLIENT_CONNECT,
    stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]])
);

if (!$socket) {
    echo "CONNECT FAILED: [$errno] $errstr\n";
    echo "\nIf errno is 0 and message is empty, it's almost always OpenSSL not enabled in php.ini.\n";
    echo "Fix: open C:/xampp/php/php.ini, find ';extension=openssl' and remove the ';', then restart Apache.\n";
    exit;
}

echo "Connected.\n";
stream_set_timeout($socket, 15);

function readResp($s) {
    $data = '';
    while ($line = fgets($s, 1024)) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $data;
}

echo "GREETING: " . readResp($socket);

fwrite($socket, "EHLO mazad.local\r\n");
echo "EHLO RESP: " . readResp($socket);

fwrite($socket, "AUTH LOGIN\r\n");
echo "AUTH LOGIN RESP: " . readResp($socket);

fwrite($socket, base64_encode($cfg['smtp_user']) . "\r\n");
echo "USER RESP: " . readResp($socket);

fwrite($socket, base64_encode($cfg['smtp_pass']) . "\r\n");
$authResp = readResp($socket);
echo "PASS RESP: " . $authResp;

if (strpos($authResp, '235') === 0) {
    echo "\n*** AUTHENTICATION SUCCEEDED ***\n";
} else {
    echo "\n*** AUTHENTICATION FAILED ***\n";
    echo "Common causes:\n";
    echo " - The 16-char value is not an app password (must be generated at https://myaccount.google.com/apppasswords)\n";
    echo " - 2-Step Verification is not enabled on the Google account (required to generate app passwords)\n";
    echo " - Spaces in the app password were not stripped\n";
}

fwrite($socket, "QUIT\r\n");
fclose($socket);
