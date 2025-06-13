const {onRequest} = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
require("firebase-functions/logger/compat");

// Initialize Firestore database connection
const db = admin.firestore();
const app = express();

// Configure middleware
app.use(compression());
app.use(cors({ origin: true }));

/**
 * Groups flying tracks by their site label and calculates statistics
 * @param {Array} flyingTracks - Array of track objects
 * @returns {Object} Grouped tracks with statistics per site
 */
function groupTracksByLabel(flyingTracks) {
    return flyingTracks.reduce((groups, track) => {
        // Use siteKey as the grouping key, fallback to 'unlabeled'
        const siteKey = track.siteKey || 'unlabeled';
        
        // Initialize group object if it doesn't exist
        if (!groups[siteKey]) {
            groups[siteKey] = {
                tracks: [],
                flyingCount: 0,
                notFlyingCount: 0,
                totalPilots: 0,
                label: track.site || 'Unknown',
            };
        }
        
        // Add track to the group and increment total pilot count
        groups[siteKey].tracks.push(track);
        groups[siteKey].totalPilots++;
        
        // Update flying status counters
        if (track.flying === "1") {
            groups[siteKey].flyingCount++;
        } else {
            groups[siteKey].notFlyingCount++;
        }
        
        return groups;
    }, {});
}

// GET endpoint to retrieve flying track data
app.get('/pureTrack', async (req, res) => {
    try {
        // Get the latest timestamp from the timestamps collection
        const timestampDoc = await db.collection('flying-tracks-timestamps').doc('latest').get();
        const currentTimestamp = timestampDoc.data().currentTimestamp;
        
        if (!currentTimestamp) {
            return res.status(404).json({ error: 'Current timestamp not found' });
        }
        
        // Try to fetch tracks for the current timestamp
        let flyingTracksSnapshot = await db.collection('flying-tracks')
            .where('createdAt', '==', currentTimestamp)
            .get();
        
        // Fallback to previous timestamp if no tracks found
        if (flyingTracksSnapshot.empty) {
            console.log('No flying tracks found for current timestamp, checking previous timestamps...');
            const previousTimestamp = timestampDoc.data().previousTimestamp;
            if (previousTimestamp) {
                flyingTracksSnapshot = await db.collection('flying-tracks')
                    .where('createdAt', '==', previousTimestamp)
                    .get();
            }
        }
        
        // Fallback to old timestamp if still no tracks found
        if (flyingTracksSnapshot.empty) {
            console.log('No flying tracks found for previous timestamp, checking old timestamps...');
            const oldTimestamp = timestampDoc.data().oldTimestamp;
            if (oldTimestamp) {
                flyingTracksSnapshot = await db.collection('flying-tracks')
                    .where('createdAt', '==', oldTimestamp)
                    .get();
            }
        }
        
        // Convert Firestore documents to plain objects
        let flyingTracks = [];
        flyingTracksSnapshot.forEach(doc => {
            flyingTracks.push({ id: doc.id, ...doc.data() });
        });
        
        // Group tracks by site and return the result
        flyingTracks = groupTracksByLabel(flyingTracks);
        res.status(200).json({
            flyingTracks
        });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});

// Export the Firebase Cloud Function
exports.flyingPilotsApi = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);