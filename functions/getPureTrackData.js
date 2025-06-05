const {onRequest} = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const compression = require('compression');


const db = admin.firestore();

const app = express();
app.use(compression());
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
        const timestampDoc = await db.collection('flying-tracks-timestamps').doc('latest').get();
        const currentTimestamp = timestampDoc.data().currentTimestamp;
        
        if (!currentTimestamp) {
            return res.status(404).json({ error: 'Current timestamp not found' });
        }
        
        let flyingTracksSnapshot = await db.collection('flying-tracks')
            .where('createdAt', '==', currentTimestamp)
            .get();
        
        if (flyingTracksSnapshot.empty) {
            console.log('No flying tracks found for current timestamp, checking previous timestamps...');
            const previousTimestamp = timestampDoc.data().previousTimestamp;
            if (previousTimestamp) {
            flyingTracksSnapshot = await db.collection('flying-tracks')
                .where('createdAt', '==', previousTimestamp)
                .get();
            }
        }
        
        if (flyingTracksSnapshot.empty) {
            console.log('No flying tracks found for previous timestamp, checking old timestamps...');
            const oldTimestamp = timestampDoc.data().oldTimestamp;
            if (oldTimestamp) {
            flyingTracksSnapshot = await db.collection('flying-tracks')
                .where('createdAt', '==', oldTimestamp)
                .get();
            }
        }
        
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