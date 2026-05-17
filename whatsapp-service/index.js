const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

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
    // Generate and scan this code with your phone
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

// Start the client
console.log('Initializing WhatsApp client... Please wait.');
client.initialize().catch(err => {
    console.error('CRITICAL: Failed to initialize WhatsApp client:', err);
});

// API Endpoint to send messages
app.post('/api/whatsapp/send', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready. Please scan the QR code in the terminal.' });
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone number and message are required.' });
    }

    try {
        // Format the phone number
        // Assuming Egyptian numbers: remove leading 0, ensure it starts with 20
        let formattedPhone = phone.trim();
        
        // Basic cleanup
        formattedPhone = formattedPhone.replace(/\D/g, ''); 
        
        // If it starts with 01, make it 201 (Egypt country code)
        if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
            formattedPhone = '2' + formattedPhone;
        } else if (formattedPhone.startsWith('1') && formattedPhone.length === 10) {
            formattedPhone = '20' + formattedPhone;
        }
        
        // Append @c.us for whatsapp-web.js
        const chatId = `${formattedPhone}@c.us`;

        console.log(`Sending WhatsApp message to: ${chatId}`);
        await client.sendMessage(chatId, message);
        
        console.log('Message sent successfully!');
        res.status(200).json({ success: true, message: 'Message sent' });
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        res.status(500).json({ success: false, error: error.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Microservice running on http://localhost:${PORT}`);
});
