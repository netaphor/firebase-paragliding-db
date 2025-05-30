const {onRequest} = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

app.get('/pureTrack', async (req, res) => {
    try {
        const [pilotStatusSnapshot, flyingTracksSnapshot] = await Promise.all([
            db.collection('pilot-status').get(),
            db.collection('flying-tracks').get()
        ]);
        
        const pilotStatusDoc = pilotStatusSnapshot.docs[0];
        const pilotStatus = pilotStatusDoc ? {
            flyingCount: pilotStatusDoc.data().flyingCount,
            notFlyingCount: pilotStatusDoc.data().notFlyingCount,
            totalPilots: pilotStatusDoc.data().totalPilots
        } : null;
        
        const flyingTracks = [];
        flyingTracksSnapshot.forEach(doc => {
            flyingTracks.push({ id: doc.id, ...doc.data() });
        });
        
        
        res.status(200).json({
            pilotStatus,
            flyingTracks
        });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});



exports.flyingPilotsApi = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);