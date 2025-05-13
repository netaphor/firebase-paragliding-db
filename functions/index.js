const {onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

//WARNING this pattern of caching in a module does not work with well with firebase functions!!
const weather = require("./data/metoffice-data-parser");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('forecast', { 
        title: 'Weather Forecast',
        forecastData: weather.getForecastData()
    });
});

// Export as a Firebase function
exports.app = onRequest({ region: 'europe-west1' }, app);
