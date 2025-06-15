const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require('express');
const path = require('path');
const app = express();
const admin = require('firebase-admin');
const db = admin.firestore();
const fs = require('fs');
const compression = require('compression');
const { defineSecret } = require('firebase-functions/params');

// Define a secret named "MY_SECRET"
const mySecret = defineSecret('MY_SECRET');


app.get('/testSecret', async (req, res) => {
    try {
        // Access the secret value
        const secretValue = mySecret.value();
        res.json({ secret: secretValue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export as a Firebase Function (v2)
exports.testSecret = onRequest({ region: 'europe-west1', maxInstances: 5 }, app);