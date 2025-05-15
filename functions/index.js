
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const weather = require("./data/metoffice-data-parser");

const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    try {
        const forecastData = await weather.getForecastData();
        console.log('Data passed to template ----------------------------:', forecastData.length);
        const outputPath = path.join("../../../", 'forecastDataRederLayer.json');
        
        res.render('forecast', { 
            title: 'Weather Forecast',
            forecastData: forecastData
        });
    } catch (error) {
        logger.error('Error fetching forecast data:', error);
        res.status(500).send('Error fetching forecast data');
    }
});

// Export as a Firebase function
exports.app = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);
