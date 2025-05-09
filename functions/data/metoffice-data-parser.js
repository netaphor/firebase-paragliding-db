const metofficeHourly = require('./metofficeHourly.json').features[0].properties;
const axios = require('axios');
const metofficeApi = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0";
const metofficeApiKey = process.env.METOFFICE_API_URL || require('../../apiKeys.js').apiKeys.metOffice;
const locationName = metofficeHourly.location.name;
const timeSeries = metofficeHourly.timeSeries;


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
            directions:["WSW", "SW", "SWS", "S"]
        },
        boPeep: {
            label: "Bo Peep",
            lat: "50.820581",
            long: "0.12876213",
            directions:["NNE","NE","ENE"]
        },
        devilsDyke: {
            label: "Devils Dyke",
            lat: "50.885079",
            long: "-0.21307468",
            directions:["WNW","NW","NNW","N"]
        },
        ditchling: {
            label: "Ditchling",
            lat: "50.86157750.903079",
            long: "-0.11699785",
            directions:["N","NNE","NNW"]
        },
        firle: {
            label: "Firle",
            lat: "50.834125",
            long: "0.086120367",
            directions:["N","NNE","NNW", "NW"]
        },
        highAndOver: {
            label: "High and Over",
            lat: "50.788195",
            long: "0.14061213",
            directions:["E","ENE","ESE"]
        },
        newhaven: {
            label: "Newhaven",
            lat: "50.782348",
            long: "0.049073696",
            directions:["SSW","S","SSE"]
        },
        beachyHead: {
            label: "Beachy Head",
            lat: "50.50.740020",
            long: "0.25347054",
            directions:["SE"]
        }
    }
}

// Function to get which sites are flyable based on wind direction
function getLocationsByDirection(direction) {
    const matchingLocations = [];

    for (const region in sitesMap) {
        for (const location in sitesMap[region]) {
            if (sitesMap[region][location].directions.includes(direction)) {
                matchingLocations.push(sitesMap[region][location].label);
            }
        }
    }

    return matchingLocations;
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

// Function to update the Met office data with additional properties
// such as wind direction, cloud base, and wind speed in mph
// This function will be called after fetching the data
function updateTimeSeries(timeSeries) {
    return timeSeries.map(entry => {
        entry.windDirectionCompass = getCompassDirection(entry.windDirectionFrom10m);
        entry.cloudBaseInFt = calculateCloudBaseInFt(entry);
        entry.cloudBaseTemp = calculateTemperatureAtCloudBase(entry.screenTemperature, entry.cloudBaseInFt);
        entry.windSpeedMph = convertMsToMph(entry.windSpeed10m);
        entry.windGustMph = convertMsToMph(entry.windGustSpeed10m);
        entry.sites = getLocationsByDirection(entry.windDirectionCompass);
        console.log(entry.windDirectionCompass + " fly at " + entry.sites + " at " + entry.time);
        return entry;
    });
}

// Fetch the forecast data for a specific location, returns a promise of Data from the MET office
var forecastData = fetchMetofficeData(50.861577, -0.050928801, metofficeApi);
forecastData.then(data => {
        console.log("Data fetched successfully");
        console.log(data);
        const timeSeries = data.features[0].properties.timeSeries;
        const updatedTimeSeries = updateTimeSeries(timeSeries);
        //console.log(updatedTimeSeries);
    }
    ).catch(error => {
        console.error("Error fetching data:", error);
    }
);

