const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Device = require("../models/Device");
const { getTelemetryDB } = require("../config/db");
const {
  getTelemetryDataByDeviceId,
  getTelemetryDataByDeviceName,
  getLatestTelemetryByDeviceName,
  getDiagnosticData
} = require("../services/mongoTelemetryService");

// Create a threshold model and collection
const thresholdSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  type: { type: String, required: true },
  threshold: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Create a compound index for fast lookups
thresholdSchema.index({ deviceId: 1, type: 1 }, { unique: true });

// Initialize the threshold model with the main database
const Threshold = mongoose.model('Threshold', thresholdSchema);

// Create a tolerance model and collection for parameters that control how much a value needs to change to be considered significant
const toleranceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  type: { type: String, required: true },
  tolerance: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Create a compound index for fast lookups
toleranceSchema.index({ deviceId: 1, type: 1 }, { unique: true });

// Initialize the tolerance model with the main database
const Tolerance = mongoose.model('Tolerance', toleranceSchema);

// 🔥 **Global function to fetch `deviceName` from MongoDB**
const fetchDeviceName = async (deviceId) => {
    try {
        const device = await Device.findById(deviceId);
        return device ? device.deviceName : null;
    } catch (error) {
        console.error(`❌ Error fetching device name for ID: ${deviceId}`, error);
        return null;
    }
};

// 🛠 **Diagnostic Route**
router.get("/diagnostic", async (req, res) => {
    try {
        console.log("🔍 Running MongoDB diagnostic...");

        const diagnosticData = await getDiagnosticData();
        
        res.json({
            status: "success",
            totalRecords: diagnosticData.totalRecords,
            devices: diagnosticData.devices,
            latestData: diagnosticData.latestData
        });
    } catch (error) {
        console.error("❌ Diagnostic error:", error);
        res.status(500).json({ status: "error", message: error.message, stack: error.stack });
    }
});

// 🔍 **MongoDB Diagnostic Route**
router.get("/mongodb-debug", async (req, res) => {
  try {
    console.log("🔍 Running MongoDB collection inspection...");
    
    // Get both database connections
    const mainDb = mongoose.connection.db;
    const telemetryDb = getTelemetryDB()?.connection.db;
    
    const result = {
      main_db: {
        name: mongoose.connection.name,
        collections: []
      },
      telemetry_db: {
        name: telemetryDb ? telemetryDb.databaseName : "Not connected",
        collections: []
      }
    };

    // Get collections from main database
    if (mainDb) {
      const collections = await mainDb.listCollections().toArray();
      result.main_db.collections = collections.map(c => c.name);
    }

    // Get collections from telemetry database
    if (telemetryDb) {
      const telemetryCollections = await telemetryDb.listCollections().toArray();
      result.telemetry_db.collections = telemetryCollections.map(c => c.name);
      
      // Get sample document from telemetry collection
      if (telemetryCollections.some(c => c.name === 'telemetry')) {
        const telemetryCollection = telemetryDb.collection('telemetry');
        const sampleDoc = await telemetryCollection.findOne();
        result.telemetry_db.sample_document = sampleDoc;
        result.telemetry_db.field_names = sampleDoc ? Object.keys(sampleDoc) : [];
      }
    }

    res.json(result);
  } catch (error) {
    console.error("❌ MongoDB debug error:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 📡 **Get Latest Telemetry Entry**
router.get("/latest/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`🔍 Fetching latest telemetry for device: ${deviceId}`);
        
        // First check if deviceId is a MongoDB ObjectId (looking for device document)
        let deviceName = deviceId;
        
        // If it looks like a MongoDB ID, try to find the device first
        if (deviceId.match(/^[0-9a-fA-F]{24}$/)) {
            try {
                const device = await Device.findById(deviceId);
                if (device) {
                    deviceName = device.deviceName;
                    console.log(`📝 Found device with name: ${deviceName}`);
                }
            } catch (err) {
                // Ignore errors - we'll try using deviceId as name directly
            }
        }

        // Try to get telemetry by device name directly
        let latestData = await getLatestTelemetryByDeviceName(deviceName);

        // If not found and deviceName is different from original deviceId, try the original as fallback
        if (!latestData && deviceName !== deviceId) {
            latestData = await getLatestTelemetryByDeviceName(deviceId);
        }

        if (!latestData) {
            console.log(`❌ No telemetry data found for device: ${deviceName}`);
            return res.json({ message: "No telemetry data available" });
        }

        console.log(`✅ Found latest telemetry for: ${deviceName}`, latestData);
        res.json(latestData);
        
    } catch (error) {
        console.error("❌ Error fetching latest telemetry:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 🔄 **Get Realtime Telemetry Data**
router.get("/realtime/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`📡 Fetching realtime telemetry for device: ${deviceId}`);

        const deviceName = await fetchDeviceName(deviceId);
        if (!deviceName) {
            return res.status(404).json({ error: "Device not found" });
        }

        // Fetch from MongoDB instead of CosmosDB
        const telemetryData = await getTelemetryDataByDeviceName(deviceName, 20);

        if (!telemetryData || telemetryData.length === 0) {
            return res.json([]);
        }

        res.json(telemetryData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (error) {
        console.error("❌ Error fetching realtime data:", error);
        res.json([]);
    }
});

// EventHub MongoDB Connection Test - Moved here to prevent it being caught by the /:deviceId route
router.get('/eventhub-test', async (req, res) => {
  try {
    console.log('🔍 Testing EventHub to MongoDB data flow...');
    
    // Get the telemetry database connection
    const telemetryDb = getTelemetryDB();
    if (!telemetryDb) {
      return res.status(500).json({ error: 'Telemetry database connection not available' });
    }
    
    // Access the telemetry collection directly
    const collection = telemetryDb.collection('telemetry');
    
    // Get the current document count before refreshing
    const beforeCount = await collection.countDocuments();
    console.log(`Current document count: ${beforeCount}`);
    
    // Check when was the latest document inserted
    const latestDocs = await collection.find()
      .sort({ Timestamp: -1, timestamp: -1 })
      .limit(10)
      .toArray();
      
    // Get count of documents in the last minute to detect new writes
    const lastMinuteCount = await collection.countDocuments({
      $or: [
        { Timestamp: { $gte: new Date(Date.now() - 60 * 1000) } },
        { timestamp: { $gte: new Date(Date.now() - 60 * 1000) } }
      ]
    });
      
    // Get the timestamp of when they were inserted
    const result = {
      connectionStatus: 'Success',
      currentTelemetryCount: beforeCount,
      newestRecordsInLastMinute: lastMinuteCount,
      latestRecords: latestDocs.map(doc => ({
        id: doc._id,
        deviceName: doc.DeviceName || doc.deviceName,
        temperature: doc.Temperature || doc.temperature,
        humidity: doc.Humidity || doc.humidity,
        timestamp: doc.Timestamp || doc.timestamp,
        mongoInsertTime: doc._id ? new Date(parseInt(doc._id.toString().substring(0, 8), 16) * 1000) : null,
        diagnosticMessage: doc.DiagnosticMessage
      })),
      collectionStats: {
        // Count of documents in the last hour
        lastHourCount: await collection.countDocuments({
          $or: [
            { Timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } },
            { timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } }
          ]
        }),
        // Count of documents in the last day
        lastDayCount: await collection.countDocuments({
          $or: [
            { Timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          ]
        }),
        // Total count of documents
        totalCount: await collection.countDocuments()
      }
    };
      
    res.json(result);
  } catch (error) {
    console.error('🚨 Error testing EventHub to MongoDB connection:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// 📊 **Get Historical Telemetry Data**
router.get("/:deviceId", async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`📜 Fetching historical telemetry for device: ${deviceId}`);

        const deviceName = await fetchDeviceName(deviceId);
        if (!deviceName) {
            return res.status(404).json({ error: "Device not found" });
        }

        // Fetch from MongoDB instead of CosmosDB
        const historicalData = await getTelemetryDataByDeviceName(deviceName, 20);

        if (!historicalData || historicalData.length === 0) {
            return res.json([]);
        }

        res.json(historicalData);
    } catch (error) {
        console.error("❌ Error fetching historical data:", error);
        res.json([]);
    }
});

// ✅ Get saved latest telemetry by deviceName (for frontend)
router.get("/saved-latest/:deviceName", async (req, res) => {
    try {
        const { deviceName } = req.params;
        console.log(`🔍 [API] Fetching saved-latest telemetry for: ${deviceName}`);

        // Fetch latest entry from MongoDB
        const latestTelemetry = await getLatestTelemetryByDeviceName(deviceName);

        if (!latestTelemetry) {
            return res.status(404).json({ message: "No telemetry data found for this device." });
        }

        res.json(latestTelemetry);
    } catch (error) {
        console.error("❌ Error in /saved-latest/:deviceName:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Add direct device lookup route for debugging
router.get("/device-lookup/:deviceName", async (req, res) => {
  try {
    const { deviceName } = req.params;
    console.log(`🔍 Looking up device in MongoDB: ${deviceName}`);

    // Get the telemetry database connection from oxygen_monitor
    const telemetryDb = getTelemetryDB();
    if (!telemetryDb) {
      return res.status(500).json({ error: "Telemetry database connection not available" });
    }
    
    const collection = telemetryDb.collection('telemetry');

    // Try different field patterns and show counts for each
    const results = {};

    // Check exact deviceName match
    results.DeviceName = await collection.countDocuments({ DeviceName: deviceName });
    results.deviceName = await collection.countDocuments({ deviceName: deviceName });
    results.device = await collection.countDocuments({ device: deviceName });
    results.device_id = await collection.countDocuments({ device_id: deviceName });

    // Check substring match (in case deviceName is embedded in another field)
    const deviceNameRegex = new RegExp(deviceName, 'i');
    results.DeviceNameRegex = await collection.countDocuments({ DeviceName: deviceNameRegex });
    results.deviceNameRegex = await collection.countDocuments({ deviceName: deviceNameRegex });
    results.deviceRegex = await collection.countDocuments({ device: deviceNameRegex });
    results.device_idRegex = await collection.countDocuments({ device_id: deviceNameRegex });

    // Get a sample document that matches any of the above patterns
    const sampleQuery = {
      $or: [
        { DeviceName: deviceNameRegex },
        { deviceName: deviceNameRegex },
        { device: deviceNameRegex },
        { device_id: deviceNameRegex }
      ]
    };
    const sampleDoc = await collection.findOne(sampleQuery);

    res.json({
      deviceName,
      database: telemetryDb.name,
      docCounts: results,
      matchFound: Object.values(results).some(count => count > 0),
      sampleDocument: sampleDoc
    });
  } catch (error) {
    console.error("❌ Error in device lookup:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/threshold/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const { metric, threshold } = req.body;
  
    try {
      // Optionally save in DB
      await saveThresholdToDB(deviceId, metric, threshold);
  
      // Send update to device via Azure IoT Hub
      await azureService.sendConfigUpdate(deviceId, {
        [metric]: threshold,
      });
  
      res.status(200).json({ message: 'Threshold sent to device' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send threshold' });
    }
  });

// Get threshold value for a specific device and type
router.get("/threshold/:deviceId/:type", async (req, res) => {
  try {
    const { deviceId, type } = req.params;
    console.log(`🔍 Fetching threshold for device ${deviceId}, type ${type}`);
    
    // Find the threshold in the database
    const thresholdDoc = await Threshold.findOne({ deviceId, type });
    
    if (!thresholdDoc) {
      // Return default thresholds if none exist
      const defaultThresholds = {
        temperature: 35,  // Default temperature threshold (35°C)
        humidity: 70,    // Default humidity threshold (70%)
        oilLevel: 15     // Default oil level threshold (15%)
      };
      
      console.log(`ℹ️ No threshold found, returning default value for ${type}: ${defaultThresholds[type]}`);
      return res.json({ threshold: defaultThresholds[type] || 0 });
    }
    
    console.log(`✅ Found threshold: ${thresholdDoc.threshold}`);
    res.json({ threshold: thresholdDoc.threshold });
  } catch (error) {
    console.error(`❌ Error fetching threshold:`, error);
    res.status(500).json({ error: "Failed to fetch threshold value" });
  }
});

// Update threshold value for a specific device and type
router.post("/threshold/:deviceId/:type", async (req, res) => {
  try {
    const { deviceId, type } = req.params;
    const { threshold } = req.body;
    
    if (threshold === undefined || threshold === null) {
      return res.status(400).json({ error: "Threshold value is required" });
    }
    
    console.log(`🔄 Updating threshold for device ${deviceId}, type ${type} to ${threshold}`);
    
    // Use findOneAndUpdate with upsert to create if it doesn't exist
    const result = await Threshold.findOneAndUpdate(
      { deviceId, type },
      { 
        threshold, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`✅ Threshold updated successfully: ${result.threshold}`);
    res.json({ success: true, threshold: result.threshold });
  } catch (error) {
    console.error(`❌ Error updating threshold:`, error);
    res.status(500).json({ error: "Failed to update threshold value" });
  }
});

// Get tolerance value for a specific device and type
router.get("/tolerance/:deviceId/:type", async (req, res) => {
  try {
    const { deviceId, type } = req.params;
    console.log(`🔍 Fetching tolerance for device ${deviceId}, type ${type}`);
    
    // Find the tolerance in the database
    const toleranceDoc = await Tolerance.findOne({ deviceId, type });
    
    if (!toleranceDoc) {
      // Return default tolerances if none exist
      const defaultTolerances = {
        temperature: 0.5,  // Default temperature tolerance (0.5°C)
        humidity: 2.0,    // Default humidity tolerance (2%)
        oilLevel: 1.0     // Default oil level tolerance (1%)
      };
      
      console.log(`ℹ️ No tolerance found, returning default value for ${type}: ${defaultTolerances[type]}`);
      return res.json({ tolerance: defaultTolerances[type] || 1.0 });
    }
    
    console.log(`✅ Found tolerance: ${toleranceDoc.tolerance}`);
    res.json({ tolerance: toleranceDoc.tolerance });
  } catch (error) {
    console.error(`❌ Error fetching tolerance:`, error);
    res.status(500).json({ error: "Failed to fetch tolerance value" });
  }
});

// Update tolerance value for a specific device and type
router.post("/tolerance/:deviceId/:type", async (req, res) => {
  try {
    const { deviceId, type } = req.params;
    const { tolerance } = req.body;
    
    if (tolerance === undefined || tolerance === null) {
      return res.status(400).json({ error: "Tolerance value is required" });
    }
    
    console.log(`🔄 Updating tolerance for device ${deviceId}, type ${type} to ${tolerance}`);
    
    // Use findOneAndUpdate with upsert to create if it doesn't exist
    const result = await Tolerance.findOneAndUpdate(
      { deviceId, type },
      { 
        tolerance, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`✅ Tolerance updated successfully: ${result.tolerance}`);
    res.json({ success: true, tolerance: result.tolerance });
  } catch (error) {
    console.error(`❌ Error updating tolerance:`, error);
    res.status(500).json({ error: "Failed to update tolerance value" });
  }
});

module.exports = router;
