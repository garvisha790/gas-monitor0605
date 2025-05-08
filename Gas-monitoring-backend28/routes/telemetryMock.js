const express = require("express");
const router = express.Router();

// Store mock alarm counts for persistence during server runtime
const mockAlarms = {
  critical: Math.floor(Math.random() * 3),
  warning: Math.floor(Math.random() * 5) + 1,
  info: Math.floor(Math.random() * 10) + 2,
  lastUpdated: new Date().toISOString()
};

// Mock threshold values - persist during server runtime
const mockThresholds = {};

// Get device seed to ensure consistent random values for specific devices
const getDeviceSeed = (deviceId) => {
  let seed = 0;
  for (let i = 0; i < deviceId.length; i++) {
    seed += deviceId.charCodeAt(i);
  }
  return seed;
};

// Enhanced mock data generator with alerts based on thresholds
const generateMockTelemetry = (deviceId) => {
  // Get device seed for consistent random generation
  const seed = getDeviceSeed(deviceId);
  const rand = () => Math.sin(seed * Date.now() * 0.001) * 0.5 + 0.5;
  
  // Base values for this device with some randomness
  const baseTemp = (seed % 10) + 65; // Base temperature between 65-75°C
  const baseHumidity = (seed % 20) + 40; // Base humidity between 40-60%
  const baseOilLevel = (seed % 30) + 40; // Base oil level between 40-70%
  
  // Add randomness within device-specific range
  const temperature = Math.floor(baseTemp + rand() * 10 - 5);
  const humidity = Math.floor(baseHumidity + rand() * 15 - 7.5);
  const oilLevel = Math.floor(baseOilLevel + rand() * 20 - 10);
  
  // Generate alerts based on thresholds
  const alerts = [];
  
  // Check against device thresholds
  if (mockThresholds[deviceId]) {
    if (mockThresholds[deviceId].temperature && temperature > mockThresholds[deviceId].temperature) {
      alerts.push({
        code: "TEMP_HIGH",
        severity: "critical",
        description: "Temperature exceeds threshold",
        value: temperature,
        threshold: mockThresholds[deviceId].temperature
      });
    }
    
    if (mockThresholds[deviceId].humidity && humidity > mockThresholds[deviceId].humidity) {
      alerts.push({
        code: "HUMIDITY_HIGH",
        severity: "warning",
        description: "Humidity exceeds threshold",
        value: humidity,
        threshold: mockThresholds[deviceId].humidity
      });
    }
    
    if (mockThresholds[deviceId].oilLevel && oilLevel < mockThresholds[deviceId].oilLevel) {
      alerts.push({
        code: "OIL_LOW",
        severity: "warning",
        description: "Oil level below threshold",
        value: oilLevel,
        threshold: mockThresholds[deviceId].oilLevel
      });
    }
  }
  
  // Randomly add a communication alert occasionally
  if (rand() < 0.05) {
    alerts.push({
      code: "COMM_DELAY",
      severity: "info",
      description: "Communication delay detected",
      value: Math.floor(rand() * 500) + 100, // 100-600ms delay
      threshold: 1000
    });
  }
  
  return {
    deviceId,
    timestamp: new Date().toISOString(),
    temperature,
    humidity,
    oilLevel,
    alerts
  };
};

// Generate historical data with realistic patterns (multiple readings)
const generateHistoricalData = (deviceId, count = 20) => {
  const data = [];
  const now = new Date();
  const seed = getDeviceSeed(deviceId);
  
  // Base values with some variation based on device ID
  const baseTemp = (seed % 10) + 65; // Base temperature between 65-75°C
  const baseHumidity = (seed % 20) + 40; // Base humidity between 40-60%
  const baseOilLevel = (seed % 30) + 40; // Base oil level between 40-70%
  
  // Generate points with realistic trends
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (i * 1000 * 60 * 5)); // 5 minute intervals
    const timeOffset = i / count; // 0 to 1 based on position in history
    
    // Create smooth variations using sine waves with different periods
    const tempVariation = Math.sin(timeOffset * Math.PI * 2) * 5;
    const humidityVariation = Math.sin(timeOffset * Math.PI * 3) * 7;
    const oilLevelVariation = Math.sin(timeOffset * Math.PI * 1.5) * 10;
    
    // Add some noise
    const tempNoise = (Math.random() - 0.5) * 2;
    const humidityNoise = (Math.random() - 0.5) * 3;
    const oilLevelNoise = (Math.random() - 0.5) * 4;
    
    // Calculate final values
    const temperature = Math.floor(baseTemp + tempVariation + tempNoise);
    const humidity = Math.floor(baseHumidity + humidityVariation + humidityNoise);
    const oilLevel = Math.floor(baseOilLevel + oilLevelVariation + oilLevelNoise);
    
    // Generate alerts based on values and thresholds
    const alerts = [];
    if (mockThresholds[deviceId]) {
      if (mockThresholds[deviceId].temperature && temperature > mockThresholds[deviceId].temperature) {
        alerts.push({
          code: "TEMP_HIGH",
          severity: "critical",
          description: "Temperature exceeds threshold",
          value: temperature,
          threshold: mockThresholds[deviceId].temperature
        });
      }
    }
    
    data.push({
      deviceId,
      timestamp: timestamp.toISOString(),
      temperature,
      humidity,
      oilLevel,
      alerts
    });
  }
  
  // Return the data sorted by timestamp (newest first)
  return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Return latest telemetry for a device
router.get("/latest/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  console.log(`📡 Mock: Getting latest telemetry for device ${deviceId}`);
  
  const mockData = generateMockTelemetry(deviceId);
  res.json(mockData);
});

// Return realtime telemetry for a device
router.get("/realtime/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  console.log(`📡 Mock: Getting realtime telemetry for device ${deviceId}`);
  
  const mockData = generateHistoricalData(deviceId, 10);
  res.json(mockData);
});

// Return historical telemetry for a device
router.get("/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  console.log(`📡 Mock: Getting historical telemetry for device ${deviceId}`);
  
  const mockData = generateHistoricalData(deviceId, 20);
  res.json(mockData);
});

// Get threshold value
router.get("/threshold/:deviceId/:type", (req, res) => {
  const { deviceId, type } = req.params;
  console.log(`📡 Mock: Getting threshold for device ${deviceId}, type ${type}`);
  
  const defaultThresholds = {
    temperature: 75,
    humidity: 60,
    oilLevel: 20
  };
  
  res.json({ threshold: defaultThresholds[type] || 0 });
});

// Update threshold value
router.post("/threshold/:deviceId/:type", (req, res) => {
  const { deviceId, type } = req.params;
  const { threshold } = req.body;
  
  console.log(`📡 Mock: Setting threshold for device ${deviceId}, type ${type} to ${threshold}`);
  
  // Initialize device thresholds if not exists
  if (!mockThresholds[deviceId]) {
    mockThresholds[deviceId] = {};
  }
  
  // Update the threshold
  mockThresholds[deviceId][type] = threshold;
  
  // Potentially trigger new alarms based on this threshold
  setTimeout(() => {
    // Add a new alarm if the threshold is lower (making it easier to trigger)
    if (Math.random() < 0.3) {
      mockAlarms[type === 'temperature' ? 'critical' : 'warning']++;
      mockAlarms.lastUpdated = new Date().toISOString();
    }
  }, 2000);
  
  res.json({ success: true, threshold });
});

// Get tolerance value
router.get("/tolerance/:deviceId/:type", (req, res) => {
  const { deviceId, type } = req.params;
  console.log(`📡 Mock: Getting tolerance for device ${deviceId}, type ${type}`);
  
  const defaultTolerances = {
    temperature: 0.5,
    humidity: 2.0,
    oilLevel: 1.0
  };
  
  res.json({ tolerance: defaultTolerances[type] || 0 });
});

// Update tolerance value
router.post("/tolerance/:deviceId/:type", (req, res) => {
  const { deviceId, type } = req.params;
  const { tolerance } = req.body;
  
  console.log(`📡 Mock: Setting tolerance for device ${deviceId}, type ${type} to ${tolerance}`);
  res.json({ success: true, tolerance });
});

// Get alarm counts
router.get("/alarms/count", (req, res) => {
  console.log(`📡 Mock: Getting alarm counts`);
  
  // Sometimes randomly update alarm counts to simulate new alarms
  if (Math.random() < 0.2) {
    const criticalChange = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const warningChange = Math.floor(Math.random() * 3) - 1;  // -1, 0, or 1
    const infoChange = Math.floor(Math.random() * 5) - 2;     // -2, -1, 0, 1, 2
    
    mockAlarms.critical = Math.max(0, mockAlarms.critical + criticalChange);
    mockAlarms.warning = Math.max(0, mockAlarms.warning + warningChange);
    mockAlarms.info = Math.max(0, mockAlarms.info + infoChange);
    mockAlarms.lastUpdated = new Date().toISOString();
  }
  
  res.json(mockAlarms);
});

// Get all plants
router.get("/plants", (req, res) => {
  console.log(`📡 Mock: Getting all plants`);
  
  const mockPlants = [
    { id: "plant1", name: "Refinery Alpha", location: "Houston, TX" },
    { id: "plant2", name: "Processing Beta", location: "Calgary, CA" },
    { id: "plant3", name: "Storage Gamma", location: "Aberdeen, UK" }
  ];
  
  res.json(mockPlants);
});

// Get devices for a plant
router.get("/plant/:plantId/devices", (req, res) => {
  const { plantId } = req.params;
  console.log(`📡 Mock: Getting devices for plant ${plantId}`);
  
  const mockDevices = [
    { id: "esp32", name: "Gas Sensor ESP32", type: "sensor" },
    { id: "thermostat1", name: "Thermostat 1", type: "controller" },
    { id: "oilmonitor2", name: "Oil Level Monitor 2", type: "sensor" },
    { id: "gasmonitor3", name: "Gas Analyzer 3", type: "analyzer" }
  ];
  
  res.json(mockDevices);
});

// Restart a device
router.post("/device/:deviceId/restart", (req, res) => {
  const { deviceId } = req.params;
  console.log(`📡 Mock: Restarting device ${deviceId}`);
  
  // Simulate a delay for the restart process
  setTimeout(() => {
    // Randomly succeed or fail
    if (Math.random() < 0.9) { // 90% success rate
      res.json({ success: true, message: `Device ${deviceId} restarted successfully` });
    } else {
      res.status(500).json({ success: false, message: `Error restarting device ${deviceId}` });
    }
  }, 1500);
});

module.exports = router;
