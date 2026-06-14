const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json({ limit: '64kb' }));

// ============================================================
// Config from env. All overridable; safe defaults for local dev.
// ============================================================
const PORT = parseInt(process.env.WHATSAPP_PORT || '3001', 10);
// Bind to loopback by default. Only widen if you explicitly want the service
// reachable from another host (e.g. inside a docker-compose network).
const BIND_ADDRESS = process.env.WHATSAPP_BIND_ADDRESS || '127.0.0.1';
// Shared-secret header. The Spring backend (when implemented) MUST send
// X-Internal-Token matching this value. If not set, the service refuses to
// start; we'd rather fail visibly than ship an open relay.
const INTERNAL_TOKEN = process.env.WHATSAPP_INTERNAL_TOKEN;
const ALLOW_INSECURE = process.env.WHATSAPP_ALLOW_INSECURE === 'true';

if (!INTERNAL_TOKEN && !ALLOW_INSECURE) {
    console.error('FATAL: WHATSAPP_INTERNAL_TOKEN env var is required.');
    console.error('Set WHATSAPP_ALLOW_INSECURE=true to bypass (local dev only).');
    process.exit(1);
}
if (ALLOW_INSECURE) {
    console.warn('WARN: WHATSAPP_ALLOW_INSECURE=true. /api/whatsapp/send is unauthenticated.');
}

// Initialize WhatsApp Client with LocalAuth to persist session
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Phase 17: surface Puppeteer/Chromium boot errors that would otherwise
        // silently kill the linking flow. handleSIGINT/HUP/TERM kept default.
        dumpio: false,
    },
});

let isClientReady = false;
let lastStateMessage = 'just-started';

// Phase 17: chatty lifecycle logging so the operator can tell exactly where
// linking is stuck. Without these events the cmd window stays blank for 60-90s
// while Puppeteer downloads / launches Chromium, and people assume it's frozen.

client.on('loading_screen', (percent, message) => {
    lastStateMessage = `loading ${percent}% - ${message}`;
    console.log('[WA]', lastStateMessage);
});

client.on('qr', (qr) => {
    lastStateMessage = 'waiting-for-qr-scan';
    console.log('\n======================================================');
    console.log('SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE');
    console.log('Open WhatsApp → Settings → Linked Devices → Link a Device');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n(QR refreshes every ~60s if not scanned)\n');
});

client.on('authenticated', () => {
    lastStateMessage = 'authenticated';
    console.log('[WA] authenticated - session persisted to .wwebjs_auth/');
});

client.on('auth_failure', msg => {
    lastStateMessage = 'auth-failure';
    console.error('[WA] AUTHENTICATION FAILURE:', msg);
    console.error('[WA] Fix: stop service, delete whatsapp-service/.wwebjs_auth/, restart.');
});

client.on('change_state', (state) => {
    lastStateMessage = `state=${state}`;
    console.log('[WA] state changed:', state);
});

client.on('ready', () => {
    isClientReady = true;
    lastStateMessage = 'READY';
    console.log('\n======================================================');
    console.log('[WA] CLIENT IS READY - messages can now be sent.');
    console.log('======================================================\n');
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    lastStateMessage = `disconnected: ${reason}`;
    console.log('[WA] Disconnected -', reason);
});

// Heartbeat: print where we are every 15s until ready. Makes "Is it hung?"
// answerable from a glance at the cmd window.
const heartbeat = setInterval(() => {
    if (isClientReady) {
        clearInterval(heartbeat);
        return;
    }
    console.log(`[WA] still initializing... last state: ${lastStateMessage}`);
}, 15000);

console.log('[WA] Initializing WhatsApp client... (first launch can take 60-120s while Puppeteer downloads/launches Chromium)');
client.initialize().catch(err => {
    console.error('\n======================================================');
    console.error('[WA] CRITICAL: client.initialize() rejected.');
    console.error('======================================================');
    console.error(err && err.stack ? err.stack : err);
    console.error('\nCommon causes:');
    console.error('  - .wwebjs_auth/ session corrupted → delete it and restart.');
    console.error('  - Antivirus / firewall blocked the bundled Chromium.');
    console.error('  - Network cannot reach web.whatsapp.com.');
    console.error('  - whatsapp-web.js version no longer compatible with WhatsApp Web.');
    console.error('    Try: npm install whatsapp-web.js@latest');
    process.exitCode = 1;
});

// ============================================================
// Auth middleware: constant-time compare the shared secret. Skip only when
// ALLOW_INSECURE was explicitly set.
// ============================================================
function requireInternalToken(req, res, next) {
    if (ALLOW_INSECURE && !INTERNAL_TOKEN) {
        return next();
    }
    const provided = req.headers['x-internal-token'];
    if (!provided || typeof provided !== 'string') {
        return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    // Length-safe constant-time compare via Buffer
    const a = Buffer.from(provided);
    const b = Buffer.from(INTERNAL_TOKEN);
    if (a.length !== b.length) {
        return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    const crypto = require('crypto');
    if (!crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    next();
}

// ============================================================
// API endpoint - protected by X-Internal-Token
// ============================================================
app.post('/api/whatsapp/send', requireInternalToken, async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready.' });
    }

    const { phone, message } = req.body || {};
    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'phone and message are required.' });
    }
    if (typeof phone !== 'string' || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'phone and message must be strings.' });
    }
    if (message.length > 4096) {
        return res.status(400).json({ success: false, error: 'message too long (max 4096 chars).' });
    }

    try {
        let formattedPhone = phone.trim().replace(/\D/g, '');

        // Assume Egyptian numbers. Convert local-format 01x to 201x.
        if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
            formattedPhone = '2' + formattedPhone;
        } else if (formattedPhone.startsWith('1') && formattedPhone.length === 10) {
            formattedPhone = '20' + formattedPhone;
        }

        const chatId = `${formattedPhone}@c.us`;

        // Do not log full numbers or message content - PII.
        console.log(`Sending WhatsApp message to chat ending ...${formattedPhone.slice(-4)}`);
        await client.sendMessage(chatId, message);

        res.status(200).json({ success: true });
    } catch (error) {
        // Log internally but do not leak error details to caller.
        console.error('Failed to send WhatsApp message:', error && error.message);
        res.status(500).json({ success: false, error: 'send_failed' });
    }
});

app.get('/health', (req, res) => {
    // Phase 17: expose lastStateMessage so an operator can `curl
    // http://localhost:3001/health` and immediately tell whether the service
    // is waiting for a QR scan, downloading Chromium, fully ready, etc.
    res.status(200).json({
        ready: isClientReady,
        state: lastStateMessage,
    });
});

app.listen(PORT, BIND_ADDRESS, () => {
    console.log(`WhatsApp microservice listening on ${BIND_ADDRESS}:${PORT}`);
    if (BIND_ADDRESS === '0.0.0.0') {
        console.warn('WARN: bound to 0.0.0.0 - service is reachable from other hosts.');
    }
});
