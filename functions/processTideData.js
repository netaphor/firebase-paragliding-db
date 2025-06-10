const axios = require('axios');
require('dotenv').config();

// Sinusoidal interpolation function
function sinusoidalInterpolate(x0, y0, x1, y1, x) {
    const t = (x - x0) / (x1 - x0);
    const smoothT = 0.5 * (1 - Math.cos(Math.PI * t));
    return y0 + (y1 - y0) * smoothT;
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
                    tideType = event.EventType === 'HighWater' ? ' (HIGH TIDE)' : ' (LOW TIDE)';
                    break;
                }
            }
            
            results.push({
                time: new Date(currentTime).toISOString(),
                height: interpolatedHeight.toFixed(2),
                tideIndicator: tideType
            });
        }
    }
    
    return results;
}

// Main function to fetch tidal data and output results
async function fetchAndDisplayTides() {
    try {
        // Example API call - replace with actual station ID and date range
        const stationId = '0001'; // Replace with actual station ID
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const apiKey = process.env.UK_TIDAL_API;
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
        
        console.log('Hourly Tide Heights:');
        console.log('===================');
        
        hourlyTides.forEach(tide => {
            console.log(`${tide.time}: ${tide.height}m${tide.tideIndicator}`);
        });
        
    } catch (error) {
        console.error('Error fetching tidal data:', error.response?.data || error.message);
    }
}

// Run the program
fetchAndDisplayTides();