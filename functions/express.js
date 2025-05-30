const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
//const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const app = express();
const admin = require('firebase-admin');
const db = admin.firestore();

async function retrieveForecastDataFromFirestore() {
    try {
        const forecastCollection = db.collection('forecastData');
        const snapshot = await forecastCollection.get();

        if (snapshot.empty) {
            console.log("No forecast data found in Firestore.");
            return [];
        }

        let documentsArray = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            documentsArray.push(data.timeSeries);
        });

        console.log("Combined data length -------------------------------- " + documentsArray.length);
        return documentsArray;

    } catch (error) {
        console.error("Error retrieving forecast data from Firestore:", error);
        throw error;
    }
}

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    try {
        const forecastData = await retrieveForecastDataFromFirestore();
        
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
exports.frontEnd = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);
