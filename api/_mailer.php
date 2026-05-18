<?php
// Minimal SMTP client for Gmail/SMTP.
// No external dependencies. Returns [bool $ok, string $errorOrLog].

function mazad_send_mail($toEmail, $toName, $subject, $htmlBody, $textBody = null)
{
    $configPath = __DIR__ . '/../config/mail.php';
    if (!file_exists($configPath)) {
        return [false, 'mail config missing'];
    }

    $cfg = require $configPath;
    if (!is_array($cfg)) {
        return [false, 'mail config invalid'];
    }

    if (array_key_exists('enabled', $cfg) && !$cfg['enabled']) {
        return [false, $cfg['error'] ?? 'mail sending disabled'];
    }

    $host = $cfg['smtp_host'] ?? $cfg['host'] ?? '';
    $port = (int)($cfg['smtp_port'] ?? $cfg['port'] ?? 0);
    $user = $cfg['smtp_user'] ?? $cfg['username'] ?? '';
    $pass = $cfg['smtp_pass'] ?? $cfg['password'] ?? '';
    $fromEmail = $cfg['from_email'] ?? $user;
    $fromName  = $cfg['from_name'] ?? 'Mazad Auction House';
    $secure = strtolower((string)($cfg['secure'] ?? ($port === 465 ? 'ssl' : ($port === 587 ? 'tls' : ''))));

    foreach ([
        'smtp_host/host' => $host,
        'smtp_port/port' => $port,
        'smtp_user/username' => $user,
        'smtp_pass/password' => $pass,
        'from_email' => $fromEmail,
        'from_name' => $fromName
    ] as $key => $value) {
        if ($value === '' || $value === 0) {
            return [false, "mail config missing key: $key"];
        }
    }

    $errno = 0; $errstr = '';
    $transport = ($secure === 'ssl' || $port === 465) ? 'ssl://' : '';
    $socket = @stream_socket_client(
        $transport . $host . ':' . $port,
        $errno, $errstr, 20,
        STREAM_CLIENT_CONNECT,
        stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]])
    );
    if (!$socket) {
        return [false, "connect failed: $errstr ($errno)"];
    }
    stream_set_timeout($socket, 20);

    $log = '';
    $read = function() use ($socket, &$log) {
        $data = '';
        while ($line = fgets($socket, 1024)) {
            $data .= $line;
            $log .= "S: $line";
            // multi-line replies have '-' at position 3; final line has ' '
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };
    $write = function($cmd, $logCmd = null) use ($socket, &$log) {
        $log .= "C: " . ($logCmd ?? $cmd);
        fwrite($socket, $cmd);
    };
    $expect = function($resp, $code) {
        return (substr($resp, 0, 3) === (string)$code);
    };

    $greet = $read();
    if (!$expect($greet, 220)) { fclose($socket); return [false, "bad greeting: $greet"]; }

    $write("EHLO mazad.local\r\n");
    $resp = $read();
    if (!$expect($resp, 250)) { fclose($socket); return [false, "EHLO failed: $resp"]; }

    if ($secure === 'tls' && $port !== 465) {
        $write("STARTTLS\r\n");
        $resp = $read();
        if (!$expect($resp, 220)) { fclose($socket); return [false, "STARTTLS failed: $resp"]; }

        $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($cryptoOk !== true) {
            fclose($socket);
            return [false, 'STARTTLS crypto negotiation failed'];
        }

        $write("EHLO mazad.local\r\n");
        $resp = $read();
        if (!$expect($resp, 250)) { fclose($socket); return [false, "EHLO after STARTTLS failed: $resp"]; }
    }

    $write("AUTH LOGIN\r\n");
    $resp = $read();
    if (!$expect($resp, 334)) { fclose($socket); return [false, "AUTH LOGIN failed: $resp"]; }

    $write(base64_encode($user) . "\r\n", "[smtp username redacted]\r\n");
    $resp = $read();
    if (!$expect($resp, 334)) { fclose($socket); return [false, "user rejected: $resp"]; }

    $write(base64_encode($pass) . "\r\n", "[smtp password redacted]\r\n");
    $resp = $read();
    if (!$expect($resp, 235)) { fclose($socket); return [false, "auth failed: $resp"]; }

    $write("MAIL FROM:<{$fromEmail}>\r\n");
    $resp = $read();
    if (!$expect($resp, 250)) { fclose($socket); return [false, "MAIL FROM failed: $resp"]; }

    $write("RCPT TO:<{$toEmail}>\r\n");
    $resp = $read();
    if (!$expect($resp, 250) && !$expect($resp, 251)) { fclose($socket); return [false, "RCPT TO failed: $resp"]; }

    $write("DATA\r\n");
    $resp = $read();
    if (!$expect($resp, 354)) { fclose($socket); return [false, "DATA failed: $resp"]; }

    $boundary = 'mazad_' . bin2hex(random_bytes(8));
    $fromHeader = sprintf('"%s" <%s>', addslashes($fromName), $fromEmail);
    $toHeader   = $toName ? sprintf('"%s" <%s>', addslashes($toName), $toEmail) : $toEmail;
    $subjectEnc = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $textBody   = $textBody ?: strip_tags($htmlBody);

    $headers  = "From: {$fromHeader}\r\n";
    $headers .= "To: {$toHeader}\r\n";
    $headers .= "Subject: {$subjectEnc}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "Message-ID: <" . bin2hex(random_bytes(12)) . "@mazad.local>\r\n";
    $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

    $body  = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($textBody)) . "\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";
    $body .= "--{$boundary}--\r\n";

    // Dot-stuff: any line beginning with '.' must be escaped as '..'
    $message = $headers . "\r\n" . $body;
    $message = preg_replace('/^\./m', '..', $message);

    $write($message . "\r\n.\r\n");
    $resp = $read();
    if (!$expect($resp, 250)) { fclose($socket); return [false, "send failed: $resp"]; }

    $write("QUIT\r\n");
    @$read();
    fclose($socket);

    return [true, $log];
}

function mazad_password_reset_email_html($code, $resetUrl = '', $expiresText = '10 minutes')
{
    $codeSafe = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $urlSafe = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');
    $expiresSafe = htmlspecialchars($expiresText, ENT_QUOTES, 'UTF-8');
    $linkHtml = $urlSafe !== ''
        ? '<p style="color:#cfcfd4;line-height:1.6">Open Mazad password recovery: <a style="color:#d4af37" href="' . $urlSafe . '">' . $urlSafe . '</a></p>'
        : '';
    return '<!DOCTYPE html><html><body style="font-family:Manrope,Arial,sans-serif;background:#0e0e10;color:#eee;padding:24px">
      <div style="max-width:520px;margin:auto;background:#17171a;border:1px solid #2a2a30;border-radius:14px;padding:28px">
        <h1 style="margin:0 0 6px;font-family:Bebas Neue,Arial,sans-serif;letter-spacing:2px;color:#d4af37">MAZAD</h1>
        <p style="color:#9a9aa3;margin:0 0 22px">Premium Auction House</p>
        <h2 style="margin:0 0 12px">Password reset code</h2>
        <p style="color:#cfcfd4;line-height:1.6">Use the code below to reset your password. It expires in ' . $expiresSafe . '.</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:800;background:#0e0e10;border:1px solid #2a2a30;border-radius:10px;padding:18px;text-align:center;color:#d4af37;margin:18px 0">' . $codeSafe . '</div>
        ' . $linkHtml . '
        <p style="color:#7d7d85;font-size:12px;margin-top:18px">If you did not request this, you can safely ignore this email.</p>
      </div>
    </body></html>';
}
