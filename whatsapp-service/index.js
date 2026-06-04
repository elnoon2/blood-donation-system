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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isClientReady = false;
client.on('loading_screen', (percent, message) => {
    console.log('WhatsApp Loading:', percent, '% -', message);
});

client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('SCAN THIS QR CODE WITH WHATSAPP TO LINK THE SYSTEM');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isClientReady = true;
});

client.on('auth_failure', msg => {
    console.error('WhatsApp Authentication failure', msg);
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    isClientReady = false;
});

console.log('Initializing WhatsApp client... Please wait.');
client.initialize().catch(err => {
    console.error('CRITICAL: Failed to initialize WhatsApp client:', err);
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
    res.status(200).json({ ready: isClientReady });
});

app.listen(PORT, BIND_ADDRESS, () => {
    console.log(`WhatsApp microservice listening on ${BIND_ADDRESS}:${PORT}`);
    if (BIND_ADDRESS === '0.0.0.0') {
        console.warn('WARN: bound to 0.0.0.0 - service is reachable from other hosts.');
    }
});
