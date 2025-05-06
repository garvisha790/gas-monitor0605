const mongoose = require('mongoose');
const { getTelemetryDB } = require('../config/db');

const telemetrySchema = new mongoose.Schema({
  DeviceName: {
    type: String,
    required: true,
  },
  Temperature: {
    type: Number,
    default: 0,
  },
  Humidity: {
    type: Number,
    default: 0,
  },
  OilLevel: {
    type: Number,
    default: 0,
  },
  OpenAlerts: {
    type: Number,
    default: 0,
  },
  Category: {
    type: String,
    default: () => new Date().toISOString().substring(0, 7), // YYYY-MM format
  },
  RawData: {
    type: String,
  },
  Timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Ensure indexes for faster queries
telemetrySchema.index({ DeviceName: 1, Timestamp: -1 });

// Create a default model with the default connection for immediate use
// This will be replaced with the actual connection when available
let TelemetryModel = mongoose.model('Telemetry', telemetrySchema);

// This function will initialize the proper model once the telemetry DB is ready
const initTelemetryModel = () => {
  const telemetryDB = getTelemetryDB();
  
  if (telemetryDB) {
    try {
      // Try to get the existing model
      TelemetryModel = telemetryDB.model('Telemetry');
    } catch (error) {
      // If model doesn't exist, create it
      TelemetryModel = telemetryDB.model('Telemetry', telemetrySchema, 'telemetry');
    }
    console.log(' Telemetry model initialized with telemetry database');
  }
};

// We'll export a module that handles the model initialization
module.exports = {
  // Get the current model (may be the default or the proper one)
  getModel: () => TelemetryModel,
  
  // Initialize the model with the proper database connection
  initModel: initTelemetryModel
};
