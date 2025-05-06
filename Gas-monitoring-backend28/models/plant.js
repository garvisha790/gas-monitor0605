const mongoose = require('mongoose');
const { getTestDB } = require('../config/db');

const plantSchema = new mongoose.Schema({
    plantName: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
});

// Create a model using the test database connection
const testDB = getTestDB();

// If testDB is available, use it; otherwise, fall back to the default connection
module.exports = testDB ? testDB.model('Plant', plantSchema) : mongoose.model('Plant', plantSchema);