const axios = require('axios');
const metofficeApiUrl = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0";
const metofficeApiKey = process.env.METOFFICE_API_URL || require('../../apiKeys.js').apiKeys.metOffice;
let updatedForecastData = null;


// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
const functions = require('firebase-functions'); // Or require('firebase-functions/v1') or v2 depending on your gen

// The Firebase Admin SDK to access Firebase services
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
// In Cloud Functions for Firebase, the environment provides the credentials automatically
admin.initializeApp();

// Get a reference to the Firestore database
const db = admin.firestore();


//const locationName = metofficeHourly.location.name;


// Fetch forecast data from the MET Office
async function fetchMetofficeData(lat, long, apiUrl) {
    let url = apiUrl + '/point/three-hourly?includeLocationName=true&latitude=' + lat + '&longitude=' + long;
    console.log(apiUrl);
    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'apikey': metofficeApiKey
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching data from Met Office API:', error.message);
        throw error;
    }
}


// Static data for the UK flying sites, currently only southern sites
const sitesMap = {
    southern: {
        caburn:{
            label: "Mount Caburn",
            lat: "50.861577",
            long: "0.050928801",
            directions:["WSW", "SW", "SWS", "S"],
            turnPoint: "GDE"
        },
        boPeep: {
            label: "Bo Peep",
            lat: "50.820581",
            long: "0.12876213",
            directions:["NNE","NE","ENE"],
            turnPoint: "AFB"
        },
        devilsDyke: {
            label: "Devils Dyke",
            lat: "50.885079",
            long: "-0.21307468",
            directions:["WNW","NW","NNW","N"],
            turnPoint: "DDK"
        },
        ditchling: {
            label: "Ditchling",
            lat: "50.86157750.903079",
            long: "-0.11699785",
            directions:["N","NNE","NNW"],
            turnPoint: "DIT"
        },
        firle: {
            label: "Firle",
            lat: "50.834125",
            long: "0.086120367",
            directions:["N","NNE","NNW", "NW"],
            turnPoint: "FIB"
        },
        highAndOver: {
            label: "High and Over",
            lat: "50.788195",
            long: "0.14061213",
            directions:["E","ENE","ESE"],
            turnPoint: "AFB"
        },
        newhaven: {
            label: "Newhaven",
            lat: "50.782348",
            long: "0.049073696",
            directions:["SSW","S","SSE"],
            turnPoint: "SEA"
        },
        beachyHead: {
            label: "Beachy Head",
            lat: "50.50.740020",
            long: "0.25347054",
            directions:["SE"],
            turnPoint: "SEA"
        }
    }
}

// Function to get which sites are flyable based on wind direction
function getLocationsByDirection(direction) {
    let siteData = {
        sites: [],
        turnPoints: [],
        correlatedSiteTurnPoints: []
    };
    
    for (const region in sitesMap) {
        for (const location in sitesMap[region]) {
            if (sitesMap[region][location].directions.includes(direction)) {
                let correlatedSiteTurnPoints = sitesMap[region][location];
                siteData.correlatedSiteTurnPoints.push(correlatedSiteTurnPoints);
                siteData.sites.push(sitesMap[region][location].label);
                siteData.turnPoints.push(sitesMap[region][location].turnPoint);
                //console.log(correlatedSiteTurnPoints);
            }
        }
    }

    return siteData;
}

// Function to convert wind direction in degrees to compass direction
function getCompassDirection(degrees) {
    const directions = [
        'N', 'NNE', 'NE', 'ENE', 
        'E', 'ESE', 'SE', 'SSE', 
        'S', 'SSW', 'SW', 'WSW', 
        'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Function to calculate temperature at cloud base
// using the approximate lapse rate of 3°C per 1000 ft
// This is a rough estimate and can vary based on local conditions
function calculateTemperatureAtCloudBase(groundTemperature, cloudBaseHeightFt) {
    const lapseRate = 3; // Approximate lapse rate in °C per 1000 ft
    const temperatureAtCloudBase = groundTemperature - (lapseRate * (cloudBaseHeightFt / 1000));
    return Math.round(temperatureAtCloudBase);
}

// Function to calculate cloud base in feet
// using the approximate formula: (T - Td) / 3 * 1000
// where T is the temperature in °C and Td is the dew point temperature in °C
// Currently tracks higher than the forecasts do
function calculateCloudBaseInFt(entry) {
    const temperature = entry.screenTemperature;
    const dewPoint = entry.screenDewPointTemperature;
    var cloudBase = ((temperature - dewPoint) / 3) * 1000; // Approximation formula
    cloudBase = Math.max(0, cloudBase); // Ensure non-negative value
    cloudBase = Math.round(cloudBase);
    return cloudBase;
}

// Function to convert wind speed from m/s to mph
function convertMsToMph(speedMs) {
    const mph = speedMs * 2.23694; // Conversion factor from m/s to mph
    return Math.round(mph * 10) / 10; // Round to 1 decimal place
}

// Function to determine flying conditions based on wind speed and gust speed
function getFlyingConditions(windSpeed, gustSpeed) {
    if (windSpeed < 12 && gustSpeed < 16) {
        return "flyable";
    } else if (windSpeed > 16 || gustSpeed > 20) {
        return "notFlyable";
    }
    return "marginal";
}


// Function to filter out entries with time at midnight, 3am, or 9pm
function filterOutSpecificTimes(timeSeries) {
    return timeSeries.filter(entry => {
        const date = new Date(entry.time);
        const hours = date.getUTCHours();
        return hours !== 0 && hours !== 3 && hours !== 21;
    });
}

// Function to update the Met office data with additional properties
// such as wind direction, cloud base, and wind speed in mph
// This function will be called after fetching the data
function updateTimeSeries(timeSeries) {
    // Filter out entries with time at midnight, 3am, or 9pm
    timeSeries = filterOutSpecificTimes(timeSeries);
    return timeSeries.map(entry => {
        entry.windDirectionCompass = getCompassDirection(entry.windDirectionFrom10m);
        entry.screenTemperature ? entry.cloudBaseInFt = calculateCloudBaseInFt(entry) : entry.cloudBaseInFt = null;
        entry.screenTemperature ? entry.cloudBaseTemp = calculateTemperatureAtCloudBase(entry.screenTemperature, entry.cloudBaseInFt) : entry.cloudBaseTemp = null;
        entry.windSpeedMph = convertMsToMph(entry.windSpeed10m);
        entry.windGustMph = convertMsToMph(entry.windGustSpeed10m);
        entry.sites = getLocationsByDirection(entry.windDirectionCompass).sites;
        entry.correlatedSiteTurnPoints = getLocationsByDirection(entry.windDirectionCompass).correlatedSiteTurnPoints;
        entry.turnPoints = getLocationsByDirection(entry.windDirectionCompass).turnPoints;
        entry.fullDay = getDayOfWeek(entry.time);
        entry.flyingConditions = getFlyingConditions(entry.windSpeedMph, entry.windGustMph);
        //console.log(entry.windDirectionCompass + " fly at " + entry.turnPoints + " on " + entry.fullDay);
        return entry;
    });
}

// Function to get day of week from timestamp
function getDayOfWeek(timestamp) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(timestamp);
    return days[date.getDay()];
}

// Function to update forecast data periodically
function startPeriodicForecastUpdate() {
    // Initial fetch
    forecastData = fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeApiUrl);
    forecastData.then(data => {
        console.log("Data fetched successfully");
        const timeSeries = data.features[0].properties.timeSeries;
        updatedForecastData = updateTimeSeries(timeSeries);
    }).catch(error => {
        console.error("Error fetching data:", error);
    });

    // Set up interval for subsequent fetches
    setInterval(() => {
        forecastData = fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeApiUrl);
        forecastData.then(data => {
            console.log("Data fetched successfully");
            const timeSeries = data.features[0].properties.timeSeries;
            updatedForecastData = updateTimeSeries(timeSeries);
            console.log("updated time series");
        }).catch(error => {
            console.error("Error fetching data:", error);
        });
    }, 600000); // 60000 milliseconds = 60 seconds
}

// Start the periodic updates
startPeriodicForecastUpdate();

exports.getForecastData = function () {
    if (updatedForecastData === null) {
        console.error("Forecast data is not yet available.");
        return null;
    }

    console.log("Forecast data is available.");
    return updatedForecastData;
};