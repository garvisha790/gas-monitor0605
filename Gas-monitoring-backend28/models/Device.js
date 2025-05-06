const mongoose = require('mongoose');
const { getTestDB } = require('../config/db');

const deviceSchema = new mongoose.Schema({
  deviceName: { type: String, required: true },
  serialNumber: { type: String, required: true },
  macId: { type: String, required: true },
  commissionedDate: { type: Date, required: true },
  plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
  parentDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null }, // 
});

// Create a model using the test database connection
const testDB = getTestDB();

// If testDB is available, use it; otherwise, fall back to the default connection
const Device = testDB ? testDB.model('Device', deviceSchema) : mongoose.model('Device', deviceSchema);

module.exports = Device;