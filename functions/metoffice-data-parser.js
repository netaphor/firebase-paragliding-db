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

// Get a reference to the Firestore database
const db = admin.firestore();

// Fetch forecast data from the MET Office
async function fetchMetofficeData(lat, long, apiUrl) {
    let url = apiUrl + lat + '&longitude=' + long;
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
        //console.log("Conditions are flyable");
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
    //console.log("Conditions are marginal");
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
    if (precipitationRate > 15) return {class: "heavy_rain", img:"/12_rain_night.svg"};
    if (precipitationRate > 7.6) return {class: "rain", img:"/12_rain.svg"};
    if (precipitationRate > 0) return {class: "light_rain", img:"/08_light_rain.svg"};
  
    // Fog and mist
    if ([5, 6].includes(significantWeatherCode)) return {class: "fog", img:"/10_fog.svg"};
  
    // Cloud and sun conditions
    if ([0, 1].includes(significantWeatherCode)) return {class: "clear", img:"/02_clear.svg"};
    if ([2, 3].includes(significantWeatherCode)) return {class: "partly_cloudy", img:"/03_partly_cloudy.svg"};
    if (significantWeatherCode === 7) return {class: "cloudy", img:"/04_cloudy.svg"};
    if (significantWeatherCode === 8) return {class: "overcast", img:"/04_cloudy.svg"};
  
    // Fallbacks using UV index as a hint
    if (uvIndex >= 4) return {class: "partly_cloudy", img:"/03_partly_cloudy.svg"};
    if (uvIndex <= 1) return {class: "overcast", img:"/04_cloudy.svg"};
  
    // Default fallback
    return {class: "cloudy", img:"/04_cloudy.svg"};
}

  
function windSpeedToScale(windSpeed) {
    if (windSpeed <= 0) return 1;
    if (windSpeed >= 30) return 10;
    return Math.ceil((windSpeed / 30) * 30);
}

//https://app19.mrsap.org/skewt/pull.php?region=UK4+2&lat=50.81163333333333&lon=0.16223333333333334&grid=d2&time=1330&plot=skewt&location=AFB
/**
 * Adds Skew-T plot URLs to an array of site objects.
 * @param {Object[]} sites - Array of objects with lat, long, and turnPoint properties.
 * @param {string|Date} date - Date string or Date object for the Skew-T plot.
 * @returns {Object[]} - The updated array with a skewtUrl property added to each object.
 */
function addSkewtUrlsToSites(sites, date) {
    if (!Array.isArray(sites) || sites.length === 0) return sites;
    // Helper to generate Skew-T URL for a single site
    function generateSkewtUrl({ lat, long, turnPoint }) {
        const now = new Date();
        const inputDate = new Date(date);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const maxDaysAhead = 6;

        // Calculate days difference
        const diffDays = Math.floor((inputDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > maxDaysAhead) return "";

        // Extract time in HHMM from date string or Date object
        let hhmm = "1200";
        if (typeof date === "string") {
            const match = date.match(/T(\d{2}):(\d{2})/);
            if (match) {
                hhmm = match[1] + match[2];
            }
        } else if (inputDate instanceof Date) {
            const h = inputDate.getUTCHours().toString().padStart(2, "0");
            const m = inputDate.getUTCMinutes().toString().padStart(2, "0");
            hhmm = h + m;
        }

        // Only allow between 07:00 and 18:00
        const hour = parseInt(hhmm.slice(0, 2), 10);
        if (hour < 7 || hour > 18) return "";

        let region;
        if (diffDays === 0) {
            region = "UK4";
        } else if (diffDays <= 2) {
            region = `UK4+${diffDays}`;
        } else {
            region = `UK12+${diffDays}`;
        }
        const url = `https://app19.mrsap.org/skewt/pull.php?region=${encodeURIComponent(region)}&lat=${lat}&lon=${long}&grid=d2&time=${hhmm}&plot=skewt&location=${encodeURIComponent(turnPoint)}`;
        return url;
    }


    // Map over the array and add skewtUrl to each object
    return sites.map(site => ({
        ...site,
        skewtUrl: generateSkewtUrl(site)
    }));
}

/**
 * Adds BLIPSPOT URLs to an array of site objects.
 * @param {Object[]} sites - Array of objects with a turnPoint property.
 * @param {string|Date} date - Date string or Date object for the BLIPSPOT plot.
 * @returns {Object[]} - The updated array with a blipspotUrl property added to each object.
 */
function addBlipspotUrlsToSites(sites, date) {
    if (!Array.isArray(sites) || sites.length === 0) return sites;

    // Get day of week as plain text (e.g., "Saturday")
    const inputDate = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[inputDate.getDay()];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDaysAhead = 7;
    const diffDays = Math.floor((inputDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > maxDaysAhead) {
        // Don't generate URLs more than 7 days ahead or in the past
        return sites.map(site => ({ ...site, blipspotUrl: "" }));
    }

    return sites.map(site => ({
        ...site,
        blipspotUrl: site.turnPoint
            ? `https://app.stratus.org.uk/blip/graph/blip_main.php?day=${encodeURIComponent(dayOfWeek)}&tp=${encodeURIComponent(site.turnPoint)}`
            : ""
    }));
}

/**
 * Updates and enriches a time series array of weather data entries with additional computed fields and classifications.
 *
 * The function performs the following steps for each entry:
 * - Filters out entries at midnight, 3am, or 9pm.
 * - Adds wind direction in compass notation.
 * - Calculates cloud base altitude (in feet) and temperature at cloud base if temperature data is available.
 * - Converts wind speed and gusts from m/s to mph and kph.
 * - Associates site and turn point data based on wind direction.
 * - Adds Skew-T and Blipspot URLs to correlated site turn points.
 * - Determines the day of the week for each entry.
 * - Categorizes wind and gust speeds.
 * - Classifies weather conditions based on precipitation, weather code, and UV index.
 * - Sets the temperature field to the maximum screen air temperature if available, otherwise uses the screen temperature.
 * - Determines flying conditions based on wind and weather classification.
 * - Groups the time series by day and removes duplicate entries by time.
 *
 * @param {Array<Object>} timeSeries - Array of weather data entries to be updated and enriched.
 * @returns {Array<Object>} The processed and enriched time series array.
 */
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
        entry.correlatedSiteTurnPoints = addSkewtUrlsToSites(entry.correlatedSiteTurnPoints, entry.time);
        entry.correlatedSiteTurnPoints = addBlipspotUrlsToSites(entry.correlatedSiteTurnPoints, entry.time);
        entry.turnPoints = siteData.turnPoints;
        entry.fullDay = getDayOfWeek(entry.time);
        entry.windCategorisation = windSpeedToScale(entry.windSpeedMph);
        entry.gustCategorisation = windSpeedToScale(entry.windGustMph);
        entry.weatherClassification = classifyWeather({
            precipitationRate: entry.precipitationRate,
            significantWeatherCode: entry.significantWeatherCode,
            uvIndex: entry.uvIndex
        });
        entry.temperature = entry.maxScreenAirTemp || entry.screenTemperature; // Use max temperature if available, otherwise use screen temperature
        entry.flyingConditions = getFlyingConditions(entry.windSpeedMph, entry.windGustMph, entry.weatherClassification.class);
        //console.log("weather", entry.correlatedSiteTurnPoints);
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
async function updateForecast() {
    try {
        // Fetch three-hourly data
        const threehourlyData = await fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeThreehourlyApiUrl);
        console.log("Three-hourly data fetched successfully");
        const threehourlyTimeSeries = threehourlyData.features[0].properties.timeSeries;
        
        // Fetch hourly data
        const hourlyData = await fetchMetofficeData(sitesMap.southern.caburn.lat, sitesMap.southern.caburn.long, metofficeHourlyApiUrl);
        console.log("Hourly data fetched successfully");
        const hourlyTimeSeries = hourlyData.features[0].properties.timeSeries;
        
        // Merge the data
        updatedForecastData = [...threehourlyTimeSeries, ...hourlyTimeSeries];

        // Process and update dataset
        updatedForecastData = updateTimeSeries(updatedForecastData);
        
        // Write the updated data to Firestore
        await writeForecastDataToFirestore(updatedForecastData);        
    } catch (error) {
        console.error("Error fetching or processing data:", error);
    }
}

exports.dataManager = onSchedule(
    { schedule: '*/15 6-21 * * *', region: 'europe-west1' }, // Every 15 minutes between 06:00 and 21:59
    async (event) => {
        console.log("Scheduled function triggered");
        try {
            await updateForecast();
            console.log("Forecast data updated successfully");
        } catch (error) {
            console.error("Error updating forecast data:", error);
        }
    }
);

console.log("Scheduled function set to run every 15 minutes");