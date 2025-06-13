const {onSchedule} = require('firebase-functions/v2/scheduler');
require("firebase-functions/logger/compat");
require('dotenv').config({ path: './.env' });
const axios = require('axios');
const sitesMap = require('./data/sitesMap.js').sitesMap; // Import the sites map
const pureTrackApiKey = process.env.PURETRACK_API_KEY;
const pureTrackBearerToken = process.env.PURETRACK_BEARER_TOKEN;
let samplePureTrackData = require('./data/pureTrackData.json'); // Import sample data for testing
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const useSampleData = false;
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const pureTrackApiUrl = useSampleData && isEmulator ? "http://127.0.0.1:5000/data/pureTrackData.json" : "https://puretrack.io/api/traffic";

// Initialize Firebase Admin SDK
const db = getFirestore();

async function getPureTrackData(lat1, long1, lat2, long2) {
  console.log('Fetching PureTrack data for coordinates:', lat1, long1, lat2, long2);
  try {
    const response = await axios.get(pureTrackApiUrl, {
      params: {
        key: pureTrackApiKey,
        b1l: lat1,
        b1g: long1,
        b2l: lat2,
        b2g: long2,
        o: 7
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pureTrackBearerToken}`
      }
    });
    console.log('Received PureTrack data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching PureTrack data:', error);
    throw error;
  }
}

function parseCoords(coords) {
    return coords.map(coordString => {
        const parts = coordString.split(',');
        const coordObj = {};
        
        parts.forEach(part => {
            if (part.length === 0) return;
            
            const key = part.charAt(0);
            const value = part.substring(1);
            
            switch (key) {
                case 'T': coordObj.timestamp = value; break;
                case 'L': coordObj.lat = value; break;
                case 'G': coordObj.long = value; break;
                case 'K': coordObj.key = value; break;
                case 'A': coordObj.alt_gps = value; break;
                case 'P': coordObj.pressure = value; break;
                case 'C': coordObj.course = value; break;
                case 'S': coordObj.speed = value; break;
                case 'V': coordObj.v_speed = value; break;
                case 'O': coordObj.object_type = value; break;
                case 'Z': coordObj.timezone = value; break;
                case 'D': coordObj.tracker_uid = value; break;
                case 'H': coordObj.stealth = value; break;
                case 'Q': coordObj.no_tracking = value; break;
                case 'I': coordObj.signal_quality = value; break;
                case 'R': coordObj.receiver_name = value; break;
                case 'U': coordObj.source_type_id = value; break;
                case 'J': coordObj.target_id = value; break;
                case 'B': coordObj.label = value; break;
                case 'N': coordObj.name = value; break;
                case 'E': coordObj.rego = value; break;
                case 'M': coordObj.model = value; break;
                case 's': coordObj.speed_calc = value; break;
                case 'd': coordObj.dist_calc = value; break;
                case 'v': coordObj.v_speed_calc = value; break;
                case 'f': coordObj.flying = value; break;
                case 'x': coordObj.ignore = value; break;
                case 'g': coordObj.gl = value; break;
                case 'i': coordObj.tracker_id = value; break;
                case 'e': coordObj.comp = value; break;
                case 'c': coordObj.colour = value; break;
                case 'a': coordObj.aircraft_id = value; break;
                case 'j': coordObj.target_key = value; break;
                case 'k': coordObj.inreach_id = value; break;
                case 'l': coordObj.spot_id = value; break;
                case 'h': coordObj.accuracy_horizontal = value; break;
                case 'z': coordObj.accuracy_vertical = value; break;
                case 'u': coordObj.username = value; break;
                case 'm': coordObj.callsign = value; break;
                case 'n': coordObj.comp_name = value; break;
                case 'b': coordObj.comp_class = value; break;
                case 'q': coordObj.comp_class_id = value; break;
                case 't': coordObj.alt_standard = value; break;
                case 'r': coordObj.thermal_climb_rate = value; break;
                case 'p': coordObj.phone = value; break;
                case 'F': coordObj.ffvl_key = value; break;
                case '!': coordObj.random = value; break;
                case '1': coordObj.take_off_id = value; break;
                case '2': coordObj.landing_id = value; break;
                case '3': coordObj.voltage_int = value; break;
                case '4': coordObj.voltage_ext = value; break;
                case '5': coordObj.satellites = value; break;
                case '6': coordObj.state = value; break;
                case '7': coordObj.set_state = value; break;
                case '8': coordObj.on_ground = value; break;
                case '^': coordObj.send_ogn_hex = value; break;
            }
        });
        
        return coordObj;
    });
}

// db is already initialized above
async function writeToFirestore(flyingData) {
  try {
    const batch = db.batch();
    const timestamp = Date.now();

    // Fetch existing flying-tracks-timestamps data if it exists
    let existingTimestamps = {};
    let flyingTracksTimeStamps = {}
    try {
      const timestampsDoc = await db.collection('flying-tracks-timestamps').doc('latest').get();
      if (timestampsDoc.exists) {
        existingTimestamps = timestampsDoc.data() || {};
        console.log('Found existing timestamps data');
      } else {
        console.log('No existing timestamps data found');
      }
    } catch (error) {
      console.error('Error fetching existing timestamps:', error);
      existingTimestamps = {};
    }

    flyingTracksTimeStamps.currentTimestamp = timestamp;
    flyingTracksTimeStamps.previousTimestamp = existingTimestamps.currentTimestamp || null;
    flyingTracksTimeStamps.oldTimestamp = existingTimestamps.previousTimestamp || null;

    
    // Write individual flying coordinates
    flyingData.forEach((coord) => {
      const docRef = db.collection('flying-tracks').doc();
      batch.set(docRef, {
      ...coord,
      createdAt: timestamp,
      updatedAt: timestamp
      });
    });
    
    await batch.commit();

    // Write the timestamps document in a separate batch
    const timestampsBatch = db.batch();
    const timestampsRef = db.collection('flying-tracks-timestamps').doc('latest');
    timestampsBatch.set(timestampsRef, flyingTracksTimeStamps);
    await timestampsBatch.commit();

    // Delete documents with old timestamp (keeping 2 versions: current and previous)
    if (existingTimestamps.previousTimestamp) {
      const oldDocsQuery = db.collection('flying-tracks').where('createdAt', '==', existingTimestamps.previousTimestamp);
      const oldDocsSnapshot = await oldDocsQuery.get();
      
      if (!oldDocsSnapshot.empty) {
        const deleteBatch = db.batch();
        oldDocsSnapshot.docs.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        console.log(`Deleted ${oldDocsSnapshot.size} old documents from timestamp: ${existingTimestamps.previousTimestamp}`);
      }
    }
    
    console.log(`Successfully wrote ${flyingData.length} flying coordinates and pilot status to Firestore`);
  } catch (error) {
    console.error('Error writing to Firestore:', error);
    throw error;
  }
}

exports.fetchPureTrackData = onSchedule({schedule: '*/2 7-21 * * *', region: 'europe-west1'}, async (event) => {
  console.log("Scheduled function triggered");
  try {
    const sites = Object.entries(sitesMap.southern);
    const allFlyingData = [];
    
    for (const [siteKey, siteData] of sites) {
      try {
        console.log(`Fetching data for site: ${siteData.label || siteKey}`);
        
        const data = await getPureTrackData(
          siteData.sites[Object.keys(siteData.sites)[0]].pureTrack.topRight.lat,
          siteData.sites[Object.keys(siteData.sites)[0]].pureTrack.topRight.long,
          siteData.sites[Object.keys(siteData.sites)[0]].pureTrack.bottomLeft.lat,
          siteData.sites[Object.keys(siteData.sites)[0]].pureTrack.bottomLeft.long
        );
        
        console.log(`Finished PureTrack data fetch for ${siteData.label || siteKey}...`, data);
        const whosFlying = parseCoords(data.data);
        
        // Add site information to each flying coordinate
        whosFlying.forEach(coord => {
          coord.site = siteData.label || siteKey;
          coord.siteKey = siteKey;
          coord.heightFt = coord.alt_gps ? Math.round(parseFloat(coord.alt_gps) * 3.28084) : null;
        });
        
        allFlyingData.push(...whosFlying);
        console.log(`Found ${whosFlying.length} flying coordinates at ${siteData.label || siteKey}`);
        
        // Wait 500ms before next request (except for the last one)
        if (sites.indexOf([siteKey, siteData]) < sites.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (siteError) {
        console.error(`Error fetching data for site ${siteData.label || siteKey}:`, siteError);
      }
    }
    
    console.log(`Total flying coordinates from all sites: ${allFlyingData.length}`);
    await writeToFirestore(allFlyingData);
    return null;
  } catch (error) {
    console.error('Error in fetchPureTrackData function:', error);
  }
});