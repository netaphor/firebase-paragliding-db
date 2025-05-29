const admin = require('firebase-admin');
// Initialize the Firebase Admin SDK
// In Cloud Functions for Firebase, the environment provides the credentials automatically
admin.initializeApp();

const {express} = require('./express.js');
const {dataManager} = require('./metoffice-data-parser.js');
const {fetchPureTrackData} = require('./pureTrack.js');

exports.dataManager = dataManager;
exports.express = express;
exports.pureTrackData = fetchPureTrackData;