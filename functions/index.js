const admin = require('firebase-admin');
// Initialize the Firebase Admin SDK
// In Cloud Functions for Firebase, the environment provides the credentials automatically
admin.initializeApp();

const {frontEnd} = require('./express.js');
const {flyingPilotsApi} = require('./getPureTrackData.js');
const {dataManager} = require('./metoffice-data-parser.js');
const {fetchPureTrackData} = require('./pureTrack.js');
const {fetchAndProcessTidalData} = require('./processTideData.js');
const {testSecret} = require('./testSecret.js');

exports.dataManager = dataManager;
exports.flyingPilotsApi = flyingPilotsApi;
exports.frontEnd = frontEnd;
exports.pureTrackData = fetchPureTrackData;
exports.tideData = fetchAndProcessTidalData;
exports.testSecret = testSecret;
