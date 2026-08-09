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
        const sessionSnapshot = await db.ref(`whatsapp_sessions/${uid}`).once('value');
        const qrSnapshot = await db.ref(`whatsapp_qr/${uid}`).once('value');
        
        res.json({
            success: true,
            session: sessionSnapshot.val() || null,
            qr: qrSnapshot.val() || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
