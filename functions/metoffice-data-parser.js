const axios = require('axios');
const sitesMap = require('./data/sitesMap.js').sitesMap; // Import the sites map
require('dotenv').config();
const metofficeThreehourlyApiUrl = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/three-hourly?includeLocationName=true&latitude=";
const metofficeHourlyApiUrl = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly?includeLocationName=true&latitude=";
const metofficeApiKey = process.env.METOFFICE_API_URL;
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
let updatedForecastData = null;

// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
const functions = require('firebase-functions'); // Or require('firebase-functions/v1') or v2 depending on your gen

// The Firebase Admin SDK to access Firebase services
const admin = require('firebase-admin');
const { time } = require('console');

// Initialize the Firebase Admin SDK
// In Cloud Functions for Firebase, the environment provides the credentials automatically
// admin.initializeApp();

// Get a reference to the Firestore database
const db = admin.firestore();

// Fetch forecast data from the MET Office
async function fetchMetofficeData(lat, long, apiUrl) {
    let url = apiUrl + lat + '&longitude=' + long;
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
    if (siteData.sites.length === 0) {
        siteData.sites.push("No flyable sites");
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

// Function to convert wind speed from m/s to kph
function convertMsToKph(speedMs) {
    const kph = speedMs * 3.6; // Conversion factor from m/s to kph
    return Math.round(kph * 10) / 10; // Round to 1 decimal place
}

// Function to determine flying conditions based on wind speed and gust speed
function getFlyingConditions(windSpeed, gustSpeed, weatherClassification) {
    if (windSpeed < 12 && gustSpeed < 16 && (weatherClassification === "clear" || weatherClassification === "partly_cloudy" || weatherClassification === "cloudy" || weatherClassification === "overcast")) {
        
        return "flyable";
    } else if (windSpeed > 16 
        || gustSpeed > 20 
        || weatherClassification === "fog" 
        || weatherClassification === "heavy_rain" 
        || weatherClassification === "rain" 
        || weatherClassification === "light_rain"
    ) {
        return "notFlyable";
    }
    console.log(windSpeed, gustSpeed, weatherClassification);
    return "marginal";
}

// Function to filter out entries outside the desired time range (6am to 9pm UTC)
function filterOutSpecificTimes(timeSeries) {
    const now = new Date();
    return timeSeries.filter(entry => {
        const date = new Date(entry.time);
        const hours = date.getUTCHours();
        return date >= now && hours >= 6 && hours <= 21;
    });
}

// We merge the three-hourly and hourly data which contains the same timestamps for some of the entries
// and we need to deduplicate them
function deduplicateTimeSeriesByTime(groupedArrays) {
    return groupedArrays.map(array => {
        const timeMap = new Map();
        array.forEach(entry => {
            const time = entry.time;
            if (!timeMap.has(time) || (entry.screenTemperature && !timeMap.get(time).screenTemperature)) {
                timeMap.set(time, entry);
            }
        });
        return Array.from(timeMap.values());
    });
}

// Function to classify precipitation amount
function classifyWeather({ precipitationRate, significantWeatherCode, uvIndex }) {
    // Rain overrides all
    if (precipitationRate > 15) return "heavy_rain";
    if (precipitationRate > 7.6) return "rain";
    if (precipitationRate > 0) return "light_rain";
  
    // Fog and mist
    if ([5, 6].includes(significantWeatherCode)) return "fog";
  
    // Cloud and sun conditions
    if ([0, 1].includes(significantWeatherCode)) return "clear";
    if ([2, 3].includes(significantWeatherCode)) return "partly_cloudy";
    if (significantWeatherCode === 7) return "cloudy";
    if (significantWeatherCode === 8) return "overcast";
  
    // Fallbacks using UV index as a hint
    if (uvIndex >= 4) return "partly_cloudy";
    if (uvIndex <= 1) return "overcast";
  
    // Default fallback
    return "cloudy";
}
  
function windSpeedToScale(windSpeed) {
    if (windSpeed <= 0) return 1;
    if (windSpeed >= 30) return 10;
    return Math.ceil((windSpeed / 30) * 30);
}


// Function to update the Met office data with additional properties
// such as wind direction, cloud base, and wind speed in mph
// This function will be called after fetching the data
function updateTimeSeries(timeSeries) {
    // Filter out entries with time at midnight, 3am, or 9pm
    timeSeries = filterOutSpecificTimes(timeSeries);
    timeSeries.map(entry => {
        entry.windDirectionCompass = getCompassDirection(entry.windDirectionFrom10m);
        entry.screenTemperature ? entry.cloudBaseInFt = calculateCloudBaseInFt(entry) : entry.cloudBaseInFt = null;
        entry.screenTemperature ? entry.cloudBaseTemp = calculateTemperatureAtCloudBase(entry.screenTemperature, entry.cloudBaseInFt) : entry.cloudBaseTemp = null;
        entry.windSpeedMph = convertMsToMph(entry.windSpeed10m);
        entry.windGustMph = convertMsToMph(entry.windGustSpeed10m);
        entry.windSpeedKph = convertMsToKph(entry.windSpeed10m);
        entry.windGustKph = convertMsToKph(entry.windGustSpeed10m);
        const siteData = getLocationsByDirection(entry.windDirectionCompass);
        entry.sites = siteData.sites;
        entry.correlatedSiteTurnPoints = siteData.correlatedSiteTurnPoints;
        entry.turnPoints = siteData.turnPoints;
        entry.fullDay = getDayOfWeek(entry.time);
        entry.windCategorisation = windSpeedToScale(entry.windSpeedMph);
        entry.weatherClassification = classifyWeather({
            precipitationRate: entry.precipitationRate,
            significantWeatherCode: entry.significantWeatherCode,
            uvIndex: entry.uvIndex
        });
        entry.flyingConditions = getFlyingConditions(entry.windSpeedMph, entry.windGustMph, entry.weatherClassification);
        //console.log(entry.windDirectionCompass + " fly at " + entry.turnPoints + " on " + entry.fullDay);
        return entry;
    });
    timeSeries = groupTimeSeriesByDay(timeSeries);
    timeSeries = deduplicateTimeSeriesByTime(timeSeries);
    return timeSeries;
}

// Function to group timeSeries entries by day
function groupTimeSeriesByDay(timeSeries) {
    // Create a map to store entries for each day
    const dayGroups = new Map();

    // Group entries by day based on the date in the time field
    timeSeries.forEach(entry => {
        const date = new Date(entry.time).toISOString().split('T')[0]; // Extract the date part (YYYY-MM-DD)
        if (!dayGroups.has(date)) {
            dayGroups.set(date, []);
        }
        dayGroups.get(date).push(entry);
    });

    // Convert map to array of arrays and sort each group by time
    const groupedArrays = Array.from(dayGroups.values()).map(group => 
        group.sort((a, b) => new Date(a.time) - new Date(b.time))
    );

    return groupedArrays;
}

// Function to get day of week from timestamp
function getDayOfWeek(timestamp) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(timestamp);
    return days[date.getDay()];
}

// Function to write forecast data to Firestore
async function writeForecastDataToFirestore(data) {
    try {
        const forecastCollection = db.collection('forecastData');
        const batch = db.batch();

        data.forEach((dayData, index) => {
            const docRef = forecastCollection.doc(`day_${index + 1}`);
            batch.set(docRef, { timeSeries: dayData });
        });

        await batch.commit();
        console.log("Forecast data successfully written to Firestore.");
    } catch (error) {
        console.error("Error writing forecast data to Firestore:", error);
    }
}


// Function to update forecast data periodically
function updateForecast() {
    // Initial fetch
    forecastData = fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeThreehourlyApiUrl);
    // Fetch three-hourly data
    forecastData.then(threehourlyData => {
        console.log("Three-hourly data fetched successfully");
        const threehourlyTimeSeries = threehourlyData.features[0].properties.timeSeries;
        
        // Fetch hourly data
        return fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeHourlyApiUrl)
            .then(hourlyData => {
                console.log("Hourly data fetched successfully");
                const hourlyTimeSeries = hourlyData.features[0].properties.timeSeries;
                
                // Merge the data
                updatedForecastData = [...threehourlyTimeSeries, ...hourlyTimeSeries];

                // Process and update dataset
                updatedForecastData = updateTimeSeries(updatedForecastData);
                
                // Write the updated data to Firestore
                writeForecastDataToFirestore(updatedForecastData)
                    .then(() => {
                        console.log("Forecast data successfully written to Firestore.");
                    })
                    .catch(error => {
                        console.error("Error writing forecast data to Firestore:", error);
                    });
            });
    }).catch(error => {
        console.error("Error fetching data:", error);
    });
}

exports.dataManager = onSchedule({schedule: 'every 15 minutes', region: 'europe-west1'}, async (event) => {
    console.log("Scheduled function triggered");
    try {
        await updateForecast();
        console.log("Forecast data updated successfully");
    } catch (error) {
        console.error("Error updating forecast data:", error);
    }
});

console.log("Scheduled function set to run every 15 minutes");

// exports.getForecastData = function () {
//     return new Promise((resolve, reject) => {
//         if (updatedForecastData === null) {
//             console.error("Forecast data is not yet available.");
//             retrieveForecastDataFromFirestore()
//                 .then(data => {
//                     console.log("Forecast data retrieved from Firestore");
//                     resolve(data);
//                 })
//                 .catch(error => {
//                     console.error("Error retrieving forecast data from Firestore:", error);
//                     reject(error);
//                 });
//         } else {
//             console.log("Forecast data is available.");
//             resolve(updatedForecastData);
//         }
//     });
// };