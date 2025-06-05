const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require('express');
const path = require('path');
const app = express();
const admin = require('firebase-admin');
const db = admin.firestore();
const fs = require('fs');
const compression = require('compression');


/**
 * An object mapping original asset file paths to their revisioned (minified or hashed) counterparts.
 * Used for cache busting and serving the correct versioned files in production.
 *
 * @type {Object.<string, string>}
 * @example
 * // Returns "css/style.min.css"
 * const minifiedCss = revManifest["css/style.css"];
 */
let revManifest = {
    "css/style.css": "css/style.min.css",
    "script/dashboard.js": "script/dashboard.min.js"
};
try {
    const manifestPath = path.join(__dirname, 'rev-manifest.json');
    if (fs.existsSync(manifestPath)) {
        revManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log('rev-manifest.json loaded', revManifest);
    } else {
        console.warn('rev-manifest.json not found');
    }
} catch (err) {
    console.error('Error loading rev-manifest.json:', err);
}
let updatedForecastData = null;

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


app.use(compression());
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
            forecastData: forecastData,
            revManifest: revManifest
        });
    } catch (error) {
        logger.error('Error fetching forecast data:', error);
        res.status(500).send('Error fetching forecast data');
    }
});

// Export as a Firebase function
exports.frontEnd = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);
