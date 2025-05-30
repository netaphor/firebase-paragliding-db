const {onRequest} = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

function groupTracksByLabel(flyingTracks) {
    return flyingTracks.reduce((groups, track) => {
        const siteKey = track.siteKey || 'unlabeled';
        if (!groups[siteKey]) {
            groups[siteKey] = {
                tracks: [],
                flyingCount: 0,
                notFlyingCount: 0,
                totalPilots: 0,
                label: track.site || 'Unknown',
            };
        }
        
        groups[siteKey].tracks.push(track);
        groups[siteKey].totalPilots++;
        
        if (track.flying === "1") {
            groups[siteKey].flyingCount++;
        } else {
            groups[siteKey].notFlyingCount++;
        }
        
        return groups;
    }, {});
}

app.get('/pureTrack', async (req, res) => {
    try {
        const flyingTracksSnapshot = await db.collection('flying-tracks').get();
        
        let flyingTracks = [];
        flyingTracksSnapshot.forEach(doc => {
            flyingTracks.push({ id: doc.id, ...doc.data() });
        });
        
        flyingTracks = groupTracksByLabel(flyingTracks);
        res.status(200).json({
            flyingTracks
        });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});




exports.flyingPilotsApi = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);