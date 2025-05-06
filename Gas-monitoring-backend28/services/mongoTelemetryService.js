const TelemetryModel = require('../models/telemetryModel');
const Device = require('../models/Device');
const mongoose = require('mongoose');
const { getTelemetryDB } = require('../config/db');

/**
 * Get the telemetry database connection
 */
const getTelemetryCollection = () => {
  const telemetryDB = getTelemetryDB();
  if (!telemetryDB) {
    throw new Error('Telemetry database connection not available');
  }
  return telemetryDB.collection('telemetry');
};

/**
 * Fetch telemetry data for a given device by its MongoDB ID
 * @param {string} deviceId - MongoDB ObjectId of the device
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Array of telemetry records
 */
const getTelemetryDataByDeviceId = async (deviceId, limit = 20) => {
  try {
    console.log(`📡 Fetching telemetry data for device ID: ${deviceId}`);

    // Get device first to ensure it exists
    const device = await Device.findById(deviceId);
    if (!device) {
      console.warn(`⚠️ No device found with ID: ${deviceId}`);
      return [];
    }

    // Use the device name to fetch telemetry
    return getTelemetryDataByDeviceName(device.deviceName, limit);
  } catch (error) {
    console.error(`❌ Error fetching telemetry for device ID: ${deviceId}`, error);
    return [];
  }
};

/**
 * Fetch telemetry data for a given device by its name
 * @param {string} deviceName - Name of the device
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Array of telemetry records
 */
const getTelemetryDataByDeviceName = async (deviceName, limit = 20) => {
  try {
    console.log(`📡 Fetching telemetry data for device name: ${deviceName}`);

    // Get the telemetry collection from oxygen_monitor database
    const collection = getTelemetryCollection();

    // Try multiple field name patterns to catch all possibilities
    const query = { $or: [
      { DeviceName: deviceName },
      { deviceName: deviceName },
      { device: deviceName }, 
      { device_id: deviceName }
    ]};

    console.log('🔄 Executing query against oxygen_monitor database:', JSON.stringify(query));

    // Execute raw MongoDB query
    const telemetryData = await collection.find(query)
      .sort({ Timestamp: -1, timestamp: -1 })
      .limit(limit * 2) // Fetch more records than needed to account for potential duplicates
      .toArray();

    if (!telemetryData || telemetryData.length === 0) {
      console.warn(`⚠️ No telemetry data found for device: ${deviceName}`);
      return [];
    }

    console.log(`✅ Found ${telemetryData.length} telemetry records in oxygen_monitor database`);
    
    // Map the data to a consistent format, handling both casing variations
    const normalizedData = telemetryData.map(data => ({
      timestamp: data.Timestamp?.toISOString() || data.timestamp?.toISOString() || new Date().toISOString(),
      temperature: data.Temperature || data.temperature || 0,
      humidity: data.Humidity || data.humidity || 0,
      oilLevel: data.OilLevel || data.oilLevel || 0,
      openAlerts: data.OpenAlerts || data.openAlerts || 0,
      // Add the original timestamp value for deduplication
      originalTimestamp: data.Timestamp || data.timestamp
    }));
    
    // Deduplicate by originalTimestamp to avoid duplicate readings
    const uniqueTimestamps = new Set();
    const dedupedData = normalizedData.filter(entry => {
      if (!entry.originalTimestamp) return true; // Keep entries without timestamp
      
      // Convert to string representation for comparison
      const timestampStr = entry.originalTimestamp.toString();
      
      // If we haven't seen this timestamp before, keep it
      if (!uniqueTimestamps.has(timestampStr)) {
        uniqueTimestamps.add(timestampStr);
        return true;
      }
      return false; // Skip duplicate timestamps
    });
    
    // Remove the temporary field and limit to requested number
    return dedupedData
      .map(({ originalTimestamp, ...rest }) => rest)
      .slice(0, limit);
      
  } catch (error) {
    console.error(`❌ Error fetching telemetry for device name: ${deviceName}`, error);
    return [];
  }
};

/**
 * Fetch the latest telemetry entry for a device
 * @param {string} deviceName - Name of the device
 * @returns {Promise<Object|null>} - Latest telemetry record or null
 */
const getLatestTelemetryByDeviceName = async (deviceName) => {
  try {
    console.log(`📡 Fetching latest telemetry entry for device: ${deviceName}`);
    
    // Get the telemetry collection from oxygen_monitor database
    const collection = getTelemetryCollection();

    // Try multiple field name patterns to catch all possibilities
    const query = { $or: [
      { DeviceName: deviceName },
      { deviceName: deviceName },
      { device: deviceName }, 
      { device_id: deviceName }
    ]};

    console.log('Executing latest telemetry query against oxygen_monitor:', JSON.stringify(query));

    // Execute raw MongoDB query - fetch a few more to ensure we get the actual latest
    const latestData = await collection.find(query)
      .sort({ Timestamp: -1, timestamp: -1 })
      .limit(5)  // Get more than just one to handle possible duplicates
      .toArray();

    if (!latestData || latestData.length === 0) {
      console.warn(`⚠️ No latest telemetry found for device: ${deviceName}`);
      return null;
    }

    console.log(`✅ Found latest telemetry for: ${deviceName} in oxygen_monitor database`);
    
    // Find unique timestamps
    const uniqueEntries = [];
    const seenTimestamps = new Set();
    
    for (const entry of latestData) {
      // Get the timestamp in a comparable format
      const timestamp = entry.Timestamp || entry.timestamp;
      if (!timestamp) continue;
      
      const timestampStr = timestamp.toString();
      
      // Only process each timestamp once
      if (!seenTimestamps.has(timestampStr)) {
        seenTimestamps.add(timestampStr);
        
        // Add to our unique entries
        uniqueEntries.push({
          timestamp: entry.Timestamp?.toISOString() || entry.timestamp?.toISOString() || new Date().toISOString(),
          temperature: entry.Temperature || entry.temperature || 0,
          humidity: entry.Humidity || entry.humidity || 0,
          oilLevel: entry.OilLevel || entry.oilLevel || 0,
          openAlerts: entry.OpenAlerts || entry.openAlerts || 0
        });
      }
    }
    
    // Return the truly latest entry (after deduplication)
    return uniqueEntries.length > 0 ? uniqueEntries[0] : null;
  } catch (error) {
    console.error(`❌ Error fetching latest telemetry for device: ${deviceName}`, error);
    return null;
  }
};

/**
 * Create a new telemetry record for a device
 * @param {string} deviceId - MongoDB ObjectId of the device or deviceName
 * @param {Object} telemetryData - Telemetry data object
 * @returns {Promise<Object>} - Created telemetry record
 */
const createTelemetryRecord = async (deviceId, telemetryData) => {
  try {
    console.log(`📝 Creating telemetry record for device: ${deviceId}`);
    
    // Get the Telemetry model
    const Telemetry = TelemetryModel.getModel();
    
    // Create new record using the telemetry model
    const newTelemetry = new Telemetry({
      DeviceName: telemetryData.deviceName || telemetryData.DeviceName || deviceId,
      Temperature: telemetryData.temperature || telemetryData.Temperature || 0,
      Humidity: telemetryData.humidity || telemetryData.Humidity || 0,
      OilLevel: telemetryData.oilLevel || telemetryData.OilLevel || 0,
      OpenAlerts: telemetryData.openAlerts || telemetryData.OpenAlerts || 0,
      RawData: JSON.stringify(telemetryData),
      Timestamp: new Date()
    });

    await newTelemetry.save();
    console.log(`✅ Successfully saved telemetry record to oxygen_monitor database`);
    
    return newTelemetry;
  } catch (error) {
    console.error(`❌ Error creating telemetry record: ${error.message}`);
    throw error;
  }
};

/**
 * Get diagnostic data for all devices
 * Uses the oxygen_monitor database to fetch telemetry records
 */
const getDiagnosticData = async () => {
  try {
    console.log('🔍 Fetching diagnostic data from oxygen_monitor database');
    
    // Get the telemetry collection from oxygen_monitor database
    const collection = getTelemetryCollection();
    
    // Get total count of telemetry records
    const totalCount = await collection.countDocuments();
    
    // Get distinct device names
    const deviceNames = await collection.distinct('DeviceName');
    
    // Get latest record for each device
    const latestRecords = [];
    for (const deviceName of deviceNames) {
      const latest = await collection.find({ DeviceName: deviceName })
        .sort({ Timestamp: -1 })
        .limit(1)
        .toArray();
      
      if (latest.length > 0) {
        latestRecords.push(latest[0]);
      }
    }
    
    return {
      totalRecords: totalCount,
      devices: deviceNames,
      latestData: latestRecords
    };
  } catch (error) {
    console.error(`❌ Error fetching diagnostic data: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getTelemetryDataByDeviceId,
  getTelemetryDataByDeviceName,
  getLatestTelemetryByDeviceName,
  createTelemetryRecord,
  getDiagnosticData
};
