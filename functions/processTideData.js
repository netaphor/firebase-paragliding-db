const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
require("firebase-functions/logger/compat");
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
require('dotenv').config();

// Sinusoidal interpolation function
function sinusoidalInterpolate(x0, y0, x1, y1, x) {
    const t = (x - x0) / (x1 - x0);
    const smoothT = 0.5 * (1 - Math.cos(Math.PI * t));
    return y0 + (y1 - y0) * smoothT;
}

// Helper to round a Date to the nearest hour
function roundToNearestHour(date) {
    const rounded = new Date(date);
    if (rounded.getMinutes() >= 30) {
        rounded.setHours(rounded.getHours() + 1);
    }
    rounded.setMinutes(0, 0, 0);
    return rounded;
}

// Function to interpolate tide heights at hourly intervals
function interpolateTideHeights(tidalEvents) {
    if (tidalEvents.length < 2) return [];
    
    const results = [];
    const startTime = new Date(tidalEvents[0].DateTime);
    const endTime = new Date(tidalEvents[tidalEvents.length - 1].DateTime);
    
    // Generate hourly intervals
    for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
        const currentTime = time.getTime();
        
        // Find surrounding tidal events
        let beforeEvent = null;
        let afterEvent = null;
        
        for (let i = 0; i < tidalEvents.length - 1; i++) {
            const eventTime = new Date(tidalEvents[i].DateTime).getTime();
            const nextEventTime = new Date(tidalEvents[i + 1].DateTime).getTime();
            
            if (currentTime >= eventTime && currentTime <= nextEventTime) {
                beforeEvent = tidalEvents[i];
                afterEvent = tidalEvents[i + 1];
                break;
            }
        }
        
        if (beforeEvent && afterEvent) {
            const beforeTime = new Date(beforeEvent.DateTime).getTime();
            const afterTime = new Date(afterEvent.DateTime).getTime();
            const beforeHeight = beforeEvent.Height;
            const afterHeight = afterEvent.Height;
            
            const interpolatedHeight = sinusoidalInterpolate(
                beforeTime, beforeHeight,
                afterTime, afterHeight,
                currentTime
            );
            
            // Check if this hour coincides with a high/low tide
            let tideType = '';
            for (const event of tidalEvents) {
                const eventTime = new Date(event.DateTime);
                if (Math.abs(eventTime.getTime() - currentTime) < 30 * 60 * 1000) { // Within 30 minutes
                    tideType = event.EventType === 'HighWater' ? 'High tide' : 'Low tide';
                    break;
                }
            }

            // Determine if tide is rising or falling
            let trend = '';
            if (afterHeight > beforeHeight) {
                trend = 'rising';
            } else if (afterHeight < beforeHeight) {
                trend = 'falling';
            } else {
                trend = 'steady';
            }

            // Calculate time until next tide turn
            let turnTime = '';
            let nextTurnDateTime = null;
            if (trend !== 'steady') {
                // Find the next high or low tide event
                let nextTurnEvent = null;
                for (const event of tidalEvents) {
                    const eventTime = new Date(event.DateTime).getTime();
                    if (eventTime > currentTime) {
                        // Check if this is the type of turn we're looking for
                        if ((trend === 'rising' && event.EventType === 'HighWater') ||
                            (trend === 'falling' && event.EventType === 'LowWater')) {
                            nextTurnEvent = event;
                            break;
                        }
                    }
                }
                
                if (nextTurnEvent) {
                    const turnEventTime = new Date(nextTurnEvent.DateTime).getTime();
                    const hoursUntilTurn = Math.round((turnEventTime - currentTime) / (1000 * 60 * 60));
                    turnTime = `${hoursUntilTurn}h`;
                    nextTurnDateTime = new Date(nextTurnEvent.DateTime).toISOString();
                }
            }

            // Add roundedTime property
            const roundedTime = roundToNearestHour(new Date(currentTime)).toISOString();
            
            results.push({
                time: new Date(currentTime).toISOString(),
                roundedTime: roundedTime,
                height: interpolatedHeight.toFixed(2),
                tideIndicator: tideType,
                trend: trend,
                turnTime: turnTime,
                nextTurnDateTime: nextTurnDateTime
            });
        }
    }
    
    return results;
}

// Main function to fetch tidal data and output results
async function fetchAndProcessTidalData(stationId) {
    try {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const UK_TIDAL_API = defineSecret('UK_TIDAL_API');
        const apiKey = UK_TIDAL_API.value();
        if (!apiKey) {
            throw new Error(`The tidal API key is not set. Please set the UK_TIDAL_API environment variable. ${process.env.UK_TIDAL_API}, another key that works is ${process.env.METOFFICE_API_URL}`);
        }
        const response = await axios.get(`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${stationId}/TidalEvents`, {
            params: {
                startDateTime: startDate,
                endDateTime: endDate
            },
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey
            }
        });
        
        const tidalEvents = response.data;
        const hourlyTides = interpolateTideHeights(tidalEvents);
        await writeTidesToFirestore(hourlyTides, stationId);
        console.log(hourlyTides.length, "hourly tides written to Firestore for station", stationId);
        
    } catch (error) {
        console.error('Error fetching tidal data:', error.response?.data || error.message);
    }
}

async function writeTidesToFirestore(hourlyTides, stationId) {
    const db = getFirestore();
    const batch = db.batch();
    const collectionRef = db.collection('tides').doc(stationId).collection('hourly');

    for (const tide of hourlyTides) {
        const docRef = collectionRef.doc(tide.roundedTime);
        batch.set(docRef, tide, { merge: true });
    }

    await batch.commit();
}

// Run the program
exports.fetchAndProcessTidalData = onSchedule(
    { schedule: '0 6-21 * * *', region: 'europe-west1' }, // Once an hour between 06:00 and 21:00
    async (event) => {
        console.log("Scheduled function triggered");
        try {
            await fetchAndProcessTidalData("0083");
            console.log("Tidal data fetched and processed successfully");
        } catch (error) {
            console.error("Error fetching tidal data", error);
        }
    }
);

