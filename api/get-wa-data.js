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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { uid } = req.query;

    try {
        const snapshot = await db.ref(`whatsapp_data/${uid}`).once('value');
        const data = snapshot.val();
        
        if (!data) return res.status(404).json({ error: 'No data found' });
        
        res.json({
            success: true,
            data: data,
            summary: {
                contacts: data.contacts ? Object.keys(data.contacts).length : 0,
                chats: data.chats ? Object.keys(data.chats).length : 0,
                messages: data.messages ? Object.keys(data.messages).length : 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
