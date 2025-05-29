
require('dotenv').config({ path: './.env' });
const axios = require('axios');
const sitesMap = require('./data/sitesMap.js').sitesMap; // Import the sites map
const pureTrackApiKey = process.env.PURETRACK_API_KEY;
const pureTrackBearerToken = process.env.PURETRACK_BEARER_TOKEN;
const pureTrackApiUrl = "https://puretrack.io/api/traffic";
const samplePureTrackData = require('./data/pureTrackData.js'); // Import sample data for testing

// Some nice part of italy in the Bassano area
const testLatLog = {
  lat1: 46.356931,
  long1: 13.003371,
  lat2: 46.134917,
  long2: 12.489487
};

console.log('PureTrack API Key:', pureTrackApiKey);
console.log('PureTrack Bearer Token:', pureTrackBearerToken);

async function getPureTrackData(lat1, long1, lat2, long2) {
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

function getFlying(parsedCoords) {
    return parsedCoords.filter(coord => coord.flying === '1').map(coord => ({
        ...coord,
        heightFt: coord.alt_gps ? Math.round(parseFloat(coord.alt_gps) * 3.28084) : null
    }));
}


getPureTrackData(
  testLatLog.lat1,
  testLatLog.long1,
  testLatLog.lat2,
  testLatLog.long2
).then(data => {
  //console.log('Raw PureTrack Data:', data);
  var whosFlying = parseCoords(data.data);
  whosFlying = getFlying(whosFlying);
  console.log('Flying Coordinates:', whosFlying);
}).catch(error => {
  console.error('Badness');
});
