require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require('ws');

const { connectDB } = require("./config/db");

// Route imports - wait for database before importing
let authRoutes, plantRoutes, deviceRoutes, telemetryRoutes, azureDeviceRoutes, alarmRoutes;

const app = express();
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients by type and device
const clients = {
  consumers: new Set(),
  producers: new Set(),
  deviceSubscriptions: {} // Maps device IDs to sets of clients subscribed to that device
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientType = url.searchParams.get('clientType') || 'consumer';
  const deviceId = url.searchParams.get('deviceId');
  
  // Set a property on the WebSocket object to track last activity
  ws.isAlive = true;
  ws.lastActivity = Date.now();
  
  // Associate client with its type
  if (clientType === 'producer') {
    clients.producers.add(ws);
    console.log(`Producer client connected - total producers: ${clients.producers.size}`);
  } else {
    clients.consumers.add(ws);
    console.log(`Consumer client connected - total consumers: ${clients.consumers.size}`);
    
    // If device ID is specified, add client to device subscriptions
    if (deviceId) {
      if (!clients.deviceSubscriptions[deviceId]) {
        clients.deviceSubscriptions[deviceId] = new Set();
      }
      clients.deviceSubscriptions[deviceId].add(ws);
      console.log(`Client subscribed to device ${deviceId} - total subscribers: ${clients.deviceSubscriptions[deviceId].size}`);
    }
  }
  
  // Handle pong messages to keep connection alive
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastActivity = Date.now();
  });
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      ws.lastActivity = Date.now();
      
      // Handle different message types
      if (data.type === 'telemetry') {
        console.log(`\u{1F4E1} Received telemetry data from ${clientType}`);
        broadcastTelemetry(data);
      } else if (data.type === 'alarm') {
        console.log(`\u{1F6A8} Received alarm data from ${clientType}`);
        broadcastAlarm(data);
      } else if (data.type === 'ping') {
        // Respond with pong message
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      } else if (data.type === 'subscribe') {
        // Handle subscription requests
        if (data.deviceId) {
          if (!clients.deviceSubscriptions[data.deviceId]) {
            clients.deviceSubscriptions[data.deviceId] = new Set();
          }
          clients.deviceSubscriptions[data.deviceId].add(ws);
          console.log(`Client subscribed to device ${data.deviceId} - total subscribers: ${clients.deviceSubscriptions[data.deviceId].size}`);
          
          // Send confirmation back to client
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            deviceId: data.deviceId,
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Handle disconnections
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.producers.delete(ws);
    clients.consumers.delete(ws);
    
    // Remove from device subscriptions
    Object.values(clients.deviceSubscriptions).forEach(deviceClients => {
      deviceClients.delete(ws);
    });
    
    // Clean up empty device subscriptions
    Object.keys(clients.deviceSubscriptions).forEach(deviceId => {
      if (clients.deviceSubscriptions[deviceId].size === 0) {
        delete clients.deviceSubscriptions[deviceId];
        console.log(`Removed empty subscription for device ${deviceId}`);
      }
    });
  });
  
  // Send initial connection confirmation with timestamp
  ws.send(JSON.stringify({ 
    type: 'connection', 
    status: 'connected', 
    clientType,
    timestamp: new Date().toISOString(),
    message: 'Connected to Gas Monitoring WebSocket Server'
  }));
});

// Function to broadcast telemetry data to all subscribers of a specific device
function broadcastTelemetry(data) {
  const deviceId = data.deviceId || data.device;
  
  // Ensure data has a timestamp
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  
  const message = JSON.stringify({
    type: 'telemetry',
    timestamp: data.timestamp,
    ...data
  });
  
  let subscriberCount = 0;
  
  // Broadcast to clients subscribed to this specific device
  if (deviceId && clients.deviceSubscriptions[deviceId]) {
    clients.deviceSubscriptions[deviceId].forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        subscriberCount++;
      }
    });
  }
  
  // Also broadcast to all consumers if they're not subscribed to a specific device
  clients.consumers.forEach(client => {
    // Only send to clients not specifically subscribed to a device
    const isSubscribedToSpecificDevice = Object.values(clients.deviceSubscriptions)
      .some(deviceClients => deviceClients.has(client));
      
    if (!isSubscribedToSpecificDevice && client.readyState === 1) {
      client.send(message);
      subscriberCount++;
    }
  });
  
  console.log(`📡 Broadcasted telemetry for device ${deviceId} to ${subscriberCount} clients`);
  return subscriberCount;
}

// Function to broadcast alarm data to all clients
function broadcastAlarm(data) {
  const message = JSON.stringify({
    type: 'alarm',
    timestamp: new Date().toISOString(),
    ...data
  });
  
  // Broadcast to all consumers
  clients.consumers.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize routes only after database connections are established
const initializeRoutes = () => {
  // Now import all route files after DB connections are ready
  try {
    authRoutes = require("./routes/authRoutes");
    plantRoutes = require("./routes/plantRoutes");
    deviceRoutes = require("./routes/deviceRoutes");
    
    // Try to load real telemetry routes first, fall back to mock if needed
    try {
      telemetryRoutes = require("./routes/telemetryRoutes");
      console.log("Using real telemetry routes");
    } catch (error) {
      console.log("Falling back to mock telemetry routes", error.message);
      telemetryRoutes = require("./routes/telemetryMock");
    }
    
    azureDeviceRoutes = require("./routes/azureDevice");
    alarmRoutes = require("./routes/alarmRoutes");
  } catch (error) {
    console.error("Error loading routes:", error);
  }
  
  // Set up routes
  app.use("/api/auth", authRoutes || express.Router());
  app.use("/api/plants", plantRoutes || express.Router());
  app.use("/api/devices", deviceRoutes || express.Router());
  app.use("/api/telemetry", telemetryRoutes || express.Router());
  app.use("/api/azure", azureDeviceRoutes || express.Router());
  app.use("/api/alarms", alarmRoutes || express.Router());
  
  // Set up special route ordering to make sure specific routes take precedence
  // This fixes the issue with /:deviceId catching other routes
  if (telemetryRoutes) {
    console.log("✅ Telemetry routes are set up!");
  }
};

// Heartbeat interval to keep track of connected clients and clean up inactive ones
const heartbeatInterval = 30000; // 30 seconds
function startHeartbeat() {
  console.log(`\u{1F49A} Starting WebSocket heartbeat interval (every ${heartbeatInterval/1000}s)`);
  
  setInterval(() => {
    // Current timestamp for age calculations
    const now = Date.now();
    
    // Check all producer clients
    clients.producers.forEach(client => {
      // If the client hasn't responded to ping or sent a message in 2 minutes
      if (now - client.lastActivity > 120000) {
        console.log('\u{1F534} Terminating inactive producer connection');
        client.terminate();
        clients.producers.delete(client);
      } else if (client.readyState === WebSocket.OPEN) {
        // Send a ping if the client is still open
        client.ping();
      }
    });
    
    // Check all consumer clients
    clients.consumers.forEach(client => {
      // If the client hasn't responded to ping or sent a message in 2 minutes
      if (now - client.lastActivity > 120000) {
        console.log('\u{1F534} Terminating inactive consumer connection');
        client.terminate();
        clients.consumers.delete(client);
        
        // Also remove from device subscriptions
        Object.values(clients.deviceSubscriptions).forEach(deviceClients => {
          deviceClients.delete(client);
        });
      } else if (client.readyState === WebSocket.OPEN) {
        // Send a ping if the client is still open
        client.ping();
      }
    });
    
    // Clean up empty device subscriptions
    Object.keys(clients.deviceSubscriptions).forEach(deviceId => {
      if (clients.deviceSubscriptions[deviceId].size === 0) {
        delete clients.deviceSubscriptions[deviceId];
        console.log(`Removed empty subscription for device ${deviceId}`);
      }
    });
    
    // Log connection stats
    console.log(`\u{1F4CA} WebSocket Stats: ${clients.producers.size} producers, ${clients.consumers.size} consumers, ${Object.keys(clients.deviceSubscriptions).length} device subscriptions`);
  }, heartbeatInterval);
}

// Simulate data function to generate mock telemetry data for testing
function startDataSimulation() {
  console.log('\u{1F4CA} Starting telemetry data simulation...');
  
  // Generate random telemetry data every 5 seconds
  setInterval(() => {
    const devices = ['esp32', 'thermostat1', 'oilmonitor2', 'gasmonitor3'];
    const deviceId = devices[Math.floor(Math.random() * devices.length)];
    
    const data = {
      deviceId,
      type: 'telemetry',
      timestamp: new Date().toISOString(),
      temperature: Math.floor(Math.random() * 20) + 60, // 60-80°C
      humidity: Math.floor(Math.random() * 30) + 40,    // 40-70%
      oilLevel: Math.floor(Math.random() * 40) + 30,    // 30-70%
      alerts: []
    };
    
    // Add random alert occasionally
    if (Math.random() < 0.2) {
      data.alerts.push({
        code: "TEMP_HIGH",
        description: "Temperature exceeds threshold",
        value: data.temperature
      });
    }
    
    // Broadcast the telemetry data
    const subscriberCount = broadcastTelemetry(data);
    
    if (subscriberCount > 0) {
      console.log(`\u{1F4E1} Simulated telemetry for ${deviceId}: temp=${data.temperature}°C, humidity=${data.humidity}%, oilLevel=${data.oilLevel}%`);
    }
  }, 5000); // Every 5 seconds
}

// Connect to multiple MongoDB databases (test and oxygen_monitor)
connectDB()
  .then(() => {
    console.log("\u{2705} Databases initialized successfully!");
    
    // Import telemetry model initialization only after DB is connected
    const TelemetryModel = require("./models/telemetryModel");
    // Initialize the telemetry model with the correct database connection
    TelemetryModel.initModel();
    
    // Now that the database connections are ready, initialize routes
    initializeRoutes();
    
    // Start server after database and routes are ready
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend serving at http://0.0.0.0:${PORT}`);
      console.log(`WebSocket server running at ws://0.0.0.0:${PORT}/ws`);
      
      // Start WebSocket heartbeat mechanism
      startHeartbeat();
      
      // Start data simulation for testing
      startDataSimulation();
    });
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err);
    process.exit(1);
  });
  
// Expose WebSocket broadcast functions for external use (e.g., from other modules)
module.exports.broadcastTelemetry = broadcastTelemetry;
module.exports.broadcastAlarm = broadcastAlarm;

// Default route for API health check
app.get("/", (req, res) => {
  res.json({ status: "API is running", message: "Gas Monitoring Backend" });
});
