const {onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const dayjs = require('dayjs');

const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Example route
app.get('/', (req, res) => {
    const today = dayjs();
    const days = [];
    const data = {};
    for (let i = 0; i < 3; i++) {
        days.push(today.add(i, 'day').format('dddd'));
    }
    
    const turnpoints = ['AFB', 'DDK', 'GDE'];
    
    data.days = days;
    data.turnpoints = turnpoints;
    // Render the EJS template
    res.render('index', { 
        title: 'Paragliding Dashboard',
        days: days,
        turnpoints: turnpoints
    });
});

// Export as a Firebase function
exports.app = functions.https.onRequest(app);
