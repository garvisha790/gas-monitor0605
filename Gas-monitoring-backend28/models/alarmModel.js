const mongoose = require('mongoose');
const { getTelemetryDB } = require('../config/db');

// Define the schema
const alarmSchema = new mongoose.Schema({
  SqlId: Number,
  AlarmId: { type: Number, required: true },
  DeviceId: { type: Number, required: true },
  AlarmValue: String,
  CreatedBy: Number,
  IsActive: { type: Boolean, default: true },
  CreatedTimestamp: { type: Date, default: Date.now },
  TelemetryKeyId: Number,
  AlarmRootCauseId: Number,
  UpdatedBy: Number,
  UpdatedTimestamp: { type: Date, default: Date.now },
  AlarmCode: String,
  AlarmDescription: String,
  DeviceName: String,
  IsRead: { type: Boolean, default: false },
  PlantName: String,
  DeviceData: String
});

// Create a model using the telemetry database connection (oxygen_monitor)
const getTelemetryModel = () => {
  const telemetryDB = getTelemetryDB();
  
  // If connection isn't ready yet, return a dummy model that will be updated
  if (!telemetryDB) {
    console.warn('u26a0ufe0f Telemetry DB connection not yet available - returning placeholder alarm model');
    return mongoose.model('Alarm', alarmSchema);
  }
  
  // Use the telemetry DB connection to create the model
  try {
    // Check if model already exists to avoid duplicate model error
    return telemetryDB.model('Alarm');
  } catch (error) {
    // Model doesn't exist yet, create it
    return telemetryDB.model('Alarm', alarmSchema, 'alarms');
  }
};

module.exports = getTelemetryModel();
