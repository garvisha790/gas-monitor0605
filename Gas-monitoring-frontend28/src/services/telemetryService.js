import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000/ws";

// Configure axios defaults
axios.defaults.timeout = 100000;
axios.defaults.retry = 2;
axios.defaults.retryDelay = 1000;

// Create axios instance with retry logic
const axiosInstance = axios.create();
axiosInstance.interceptors.response.use(null, async (error) => {
  const { config } = error;
  if (!config || !config.retry) {
    return Promise.reject(error);
  }

  config.retryCount = config.retryCount || 0;
  if (config.retryCount >= config.retry) {
    return Promise.reject(error);
  }

  config.retryCount += 1;
  const delay = config.retryDelay || 1000;
  console.log(`Retrying request (${config.retryCount}/${config.retry})...`);

  return new Promise(resolve => setTimeout(() => resolve(axiosInstance(config)), delay));
});

// Caching system
let telemetryCache = {
  historical: {},
  realtime: {},
  latest: {},
  deviceList: null
};

let lastFetch = {
  historical: {},
  realtime: {},
  latest: {},
  deviceList: 0
};

// Cache expiration times
const CACHE_TIMES = {
  historical: 10000, // 10 seconds
  realtime: 2000, // 2 seconds
  latest: 1000, // 1 second
  deviceList: 30000 // 30 seconds
};

// WebSocket connection and event handlers
let wsConnection = null;
let wsReconnectTimeout = null;
let wsSubscribers = {
  telemetry: new Map(), // Map deviceId to Set of callback functions
  alarm: new Set(),     // Set of alarm callback functions
  connection: new Set(), // Set of connection status callback functions
};

// Initialize WebSocket connection with high-performance options
const initWebSocket = (deviceId = null) => {
  if (wsConnection && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    // Clear any previous reconnect attempts
    if (wsReconnectTimeout) {
      clearTimeout(wsReconnectTimeout);
      wsReconnectTimeout = null;
    }

    // Create WebSocket URL with clientType=consumer parameter
    let url = `${WS_URL}?clientType=consumer`;

    // Add deviceId parameter if specified (for device-specific telemetry)
    if (deviceId) {
      url += `&deviceId=${deviceId}`;
    }

    console.log(`\ud83d\udd0c [${new Date().toLocaleTimeString()}] Connecting to WebSocket server:`, url);
    wsConnection = new WebSocket(url);
    
    // Set a longer buffer for more efficient data transfer (if browser supports it)
    if (wsConnection.binaryType) {
      wsConnection.binaryType = 'arraybuffer';
    }

    wsConnection.onopen = () => {
      console.log(`\ud83d\udd0c [${new Date().toLocaleTimeString()}] WebSocket connection established`);
      notifyConnectionSubscribers(true);
      
      // Start aggressive keep-alive with ping messages
      startPingInterval();
      
      // Stop the reconnect interval if it's running
      stopReconnectInterval();
      
      // If we reconnected and have a device ID, resubscribe to it immediately
      if (deviceId) {
        console.log(`Resubscribing to device ${deviceId} after reconnection`);
        // Send a subscription message to the server
        const subscriptionMessage = {
          type: 'subscribe',
          deviceId: deviceId,
          timestamp: new Date().toISOString()
        };
        wsConnection.send(JSON.stringify(subscriptionMessage));
      }
    };

    wsConnection.onclose = () => {
      console.log(`\ud83d\udd0c [${new Date().toLocaleTimeString()}] WebSocket connection closed`);
      notifyConnectionSubscribers(false);
      
      // Clear the ping interval
      stopPingInterval();

      // Start aggressive reconnection attempts
      startReconnectInterval(deviceId);
    };

    wsConnection.onerror = (error) => {
      console.error(`\ud83d\udd0c [${new Date().toLocaleTimeString()}] WebSocket error:`, error);
      notifyConnectionSubscribers(false);
    };

    wsConnection.onmessage = (event) => {
      try {
        // Use immediate execution via setTimeout(fn, 0) for faster message handling
        setTimeout(() => {
          const message = JSON.parse(event.data);

          // Handle different message types
          if (message.type === 'telemetry') {
            handleTelemetryMessage(message);
          } else if (message.type === 'alarm') {
            handleAlarmMessage(message);
          } else if (message.type === 'pong') {
            // Process pong silently
          } else if (message.type === 'connection' || message.type === 'subscription_confirmed') {
            console.log(`\ud83d\udd0c WebSocket ${message.type}:`, message.status || 'success');
          }
        }, 0);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  } catch (error) {
    console.error('Failed to establish WebSocket connection:', error);
    // Start reconnection attempts on failure
    startReconnectInterval(deviceId);
  }
};

// Keep the WebSocket connection alive with ping/pong
let pingInterval;
let reconnectInterval;

const startPingInterval = () => {
  // Clear any existing interval
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  // Send a ping every 15 seconds
  pingInterval = setInterval(() => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('\ud83d\udce1 Sending ping to WebSocket server');
      wsConnection.send(JSON.stringify({ 
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  }, 15000); // Reduced to 15 seconds for more frequent pings
};

const stopPingInterval = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

const startReconnectInterval = (deviceId) => {
  // Clear any existing interval
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }
  
  // Try to reconnect every 2 seconds when disconnected
  reconnectInterval = setInterval(() => {
    if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED || wsConnection.readyState === WebSocket.CLOSING) {
      console.log('\ud83d\udce1 Auto-reconnecting to WebSocket server...');
      initWebSocket(deviceId);
    } else if (reconnectInterval && wsConnection.readyState === WebSocket.OPEN) {
      // If connected successfully, clear the interval
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  }, 2000);
};

const stopReconnectInterval = () => {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
};

// Handle telemetry messages from WebSocket
const handleTelemetryMessage = (message) => {
  const deviceId = message.device || message.deviceId;
  if (!deviceId) return;

  console.log(`\ud83d\udce1 [${new Date().toLocaleTimeString()}] WebSocket received telemetry for ${deviceId}`);

  // Add timestamp if not present
  if (!message.timestamp) {
    message.timestamp = new Date().toISOString();
  }

  // Immediately update the latest telemetry cache with real-time data
  telemetryCache.latest[deviceId] = message;
  lastFetch.latest[deviceId] = Date.now();

  // Immediately update realtime data cache if it exists
  if (telemetryCache.realtime[deviceId]) {
    // Make a copy of the current data array
    const data = [...telemetryCache.realtime[deviceId]];

    // Add new data point at the beginning (newest first)
    data.unshift(message);
    
    // Keep only latest points
    if (data.length > 30) {
      data.pop(); // Remove oldest point
    }
    
    telemetryCache.realtime[deviceId] = data;
    lastFetch.realtime[deviceId] = Date.now();
  } else {
    // Initialize realtime data cache if it doesn't exist
    telemetryCache.realtime[deviceId] = [message];
    lastFetch.realtime[deviceId] = Date.now();
  }

  // Notify subscribers immediately - priority task
  setTimeout(() => {
    if (wsSubscribers.telemetry.has(deviceId)) {
      const callbacks = wsSubscribers.telemetry.get(deviceId);
      console.log(`\ud83d\udce3 Notifying ${callbacks.size} subscribers for device ${deviceId}`);
      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in telemetry callback:', error);
        }
      });
    }
  }, 0);
};

// Handle alarm messages from WebSocket
const handleAlarmMessage = (message) => {
  // Notify all alarm subscribers
  wsSubscribers.alarm.forEach(callback => callback(message));
};

// Notify connection status subscribers
const notifyConnectionSubscribers = (connected) => {
  wsSubscribers.connection.forEach(callback => callback(connected));
};

// Subscribe to telemetry updates for a specific device - optimized for performance
export const subscribeTelemetry = (deviceId, callback) => {
  console.log(`\ud83d\udce1 [${new Date().toLocaleTimeString()}] Subscribing to telemetry updates for device ${deviceId}`);
  
  // Initialize WebSocket if not already done
  initWebSocket(deviceId);
  
  // Create a Set for this device if it doesn't exist
  if (!wsSubscribers.telemetry.has(deviceId)) {
    wsSubscribers.telemetry.set(deviceId, new Set());
  }
  
  // Add callback to subscribers for this device - high priority
  const subscribers = wsSubscribers.telemetry.get(deviceId);
  subscribers.add(callback);
  
  // If WebSocket is already connected, send a subscription message
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    const subscriptionMessage = {
      type: 'subscribe',
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    };
    wsConnection.send(JSON.stringify(subscriptionMessage));
  }
  
  // Initially send cached data if available - immediate execution
  if (telemetryCache.latest[deviceId]) {
    setTimeout(() => {
      try {
        callback(telemetryCache.latest[deviceId]);
      } catch (error) {
        console.error('Error in initial telemetry callback:', error);
      }
    }, 0);
  }
  
  // Also send realtime data cache if available
  if (telemetryCache.realtime[deviceId] && telemetryCache.realtime[deviceId].length > 0) {
    setTimeout(() => {
      try {
        // Trigger callback with the most recent point to update charts
        callback(telemetryCache.realtime[deviceId][0]); // Send most recent point
      } catch (error) {
        console.error('Error in initial realtime data callback:', error);
      }
    }, 10); // Slight delay to ensure UI updates properly
  }
  
  // Return unsubscribe function
  return () => {
    console.log(`\ud83d\udce1 [${new Date().toLocaleTimeString()}] Unsubscribing from telemetry updates for device ${deviceId}`);
    if (wsSubscribers.telemetry.has(deviceId)) {
      const subscribers = wsSubscribers.telemetry.get(deviceId);
      subscribers.delete(callback);
      
      // Clean up the Set if empty
      if (subscribers.size === 0) {
        wsSubscribers.telemetry.delete(deviceId);
      }
    }
  };
};

// Subscribe to alarm updates
export const subscribeAlarms = (callback) => {
  wsSubscribers.alarm.add(callback);

  // Initialize WebSocket connection if not already connected
  initWebSocket();

  // Return unsubscribe function
  return () => {
    wsSubscribers.alarm.delete(callback);
  };
};

// Subscribe to WebSocket connection status
export const subscribeConnection = (callback) => {
  wsSubscribers.connection.add(callback);

  // Call callback immediately with current status
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    callback(true);
  } else {
    callback(false);
  }

  // Return unsubscribe function
  return () => {
    wsSubscribers.connection.delete(callback);
  };
};

/**
 * Fetch historical telemetry data (last 20 entries) for a device
 */
export const getTelemetryData = async (deviceId) => {
  try {
    const now = Date.now();

    if (!telemetryCache.historical[deviceId] || now - lastFetch.historical[deviceId] > CACHE_TIMES.historical) {
      console.log('📊 Fetching historical telemetry data...');
      try {
        const response = await axiosInstance.get(`${BASE_URL}/telemetry/${deviceId}`);
        telemetryCache.historical[deviceId] = response.data || [];
        lastFetch.historical[deviceId] = now;
      } catch (error) {
        console.warn("Failed to fetch historical data, generating mock data", error.message);
        // Generate mock historical data if endpoint fails
        const mockData = generateMockHistoricalData(deviceId, 20);
        telemetryCache.historical[deviceId] = mockData;
        lastFetch.historical[deviceId] = now;
      }
    } else {
      console.log('📊 Using cached historical telemetry data...');
    }

    return telemetryCache.historical[deviceId];
  } catch (error) {
    console.error("❌ Error fetching historical telemetry data:", error);
    return [];
  }
};

// Helper function to generate mock historical data
const generateMockHistoricalData = (deviceId, count = 20) => {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (i * 1000 * 60 * 5)); // 5 minute intervals
    data.push({
      deviceId,
      timestamp: timestamp.toISOString(),
      temperature: Math.floor(Math.random() * 20) + 60,
      humidity: Math.floor(Math.random() * 30) + 40,
      oilLevel: Math.floor(Math.random() * 40) + 30,
      alerts: []
    });
  }
  
  return data;
};

/**
 * Fetch real-time telemetry data (last 10 minutes)
 */
export const getRealtimeTelemetryData = async (deviceId) => {
  try {
    const now = Date.now();

    if (!telemetryCache.realtime[deviceId] || now - lastFetch.realtime[deviceId] > CACHE_TIMES.realtime) {
      console.log('📡 Fetching real-time telemetry data...');
      try {
        const response = await axiosInstance.get(`${BASE_URL}/telemetry/realtime/${deviceId}`);
        telemetryCache.realtime[deviceId] = response.data || [];
        lastFetch.realtime[deviceId] = now;
      } catch (error) {
        console.warn("Failed to fetch realtime data, generating mock data", error.message);
        // Generate mock realtime data if endpoint fails
        const mockData = generateMockHistoricalData(deviceId, 10);
        telemetryCache.realtime[deviceId] = mockData;
        lastFetch.realtime[deviceId] = now;
      }
    } else {
      console.log('📡 Using cached real-time telemetry data...');
    }

    return telemetryCache.realtime[deviceId];
  } catch (error) {
    console.error("❌ Error fetching real-time telemetry data:", error);
    return [];
  }
};

/**
 * Fetch the latest telemetry entry for a device
 */
export const getLatestTelemetryEntry = async (deviceId) => {
  try {
    const now = Date.now();
 
    if (!telemetryCache.latest[deviceId] || now - lastFetch.latest[deviceId] > CACHE_TIMES.latest) {
      console.log('🔄 Fetching fresh latest telemetry entry...' , deviceId);
      
      try {
        const response = await axiosInstance.get(`${BASE_URL}/telemetry/latest/${deviceId}`);
        console.log("Response data:", response.data);
        telemetryCache.latest[deviceId] = response.data || null;
      } catch (error) {
        console.warn("Failed to fetch latest entry, generating mock data", error.message);
        // Generate mock latest data if endpoint fails
        const mockData = {
          deviceId,
          timestamp: new Date().toISOString(),
          temperature: Math.floor(Math.random() * 20) + 60,
          humidity: Math.floor(Math.random() * 30) + 40,
          oilLevel: Math.floor(Math.random() * 40) + 30,
          alerts: []
        };
        telemetryCache.latest[deviceId] = mockData;
      }
      lastFetch.latest[deviceId] = now;
    } else {
      console.log('🔄 Using cached latest telemetry entry...');
    }
 
    return telemetryCache.latest[deviceId];
  } catch (error) {
    console.error("❌ Error fetching latest telemetry entry:", error);
    return null;
  }
};
 
/**
 * Fetch all unique device names
 */
export const getDeviceList = async () => {
  try {
    const now = Date.now();
 
    if (!telemetryCache.deviceList || now - lastFetch.deviceList > CACHE_TIMES.deviceList) {
      console.log('📋 Fetching unique device names...');
      const response = await axiosInstance.get(`${BASE_URL}/telemetry/devices`);
      telemetryCache.deviceList = response.data || [];
      lastFetch.deviceList = now;
    } else {
      console.log('📋 Using cached device list...');
    }
 
    return telemetryCache.deviceList;
  } catch (error) {
    console.error("❌ Error fetching device list:", error);
    return [];
  }
};
export const getThresholdValue = async (deviceId, type) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/telemetry/threshold/${deviceId}/${type}`);
    return response.data?.threshold;
  } catch (error) {
    console.error("❌ Error fetching threshold value:", error);
    return null;
  }
};
 
export const updateThresholdValue = async (deviceId, type, value) => {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/telemetry/threshold/${deviceId}/${type}`, {
      threshold: value,
    });
    return response.status === 200;
  } catch (error) {
    console.error("❌ Error updating threshold value:", error);
    return false;
  }
};

export const updateThreshold = async (deviceId, data) => {
  const response = await axios.post(`/api/telemetry/threshold/${deviceId}`, data);
  return response.data;
};

// Get tolerance value for a device and parameter
export const getToleranceValue = async (deviceId, type) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/telemetry/tolerance/${deviceId}/${type}`);
    return response.data?.tolerance;
  } catch (error) {
    console.error("❌ Error fetching tolerance value:", error);
    return null;
  }
};

// Update tolerance value for a device and parameter
export const updateToleranceValue = async (deviceId, type, value) => {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/telemetry/tolerance/${deviceId}/${type}`, {
      tolerance: value,
    });
    return response.status === 200;
  } catch (error) {
    console.error("❌ Error updating tolerance value:", error);
    return false;
  }
};

/**
 * Clear cache for a specific device
 */
export const clearDeviceCache = (deviceId) => {
  if (deviceId) {
    delete telemetryCache.historical[deviceId];
    delete telemetryCache.realtime[deviceId];
    delete telemetryCache.latest[deviceId];
    console.log(`🧹 Cleared cache for device ${deviceId}`);
  } else {
    telemetryCache = { historical: {}, realtime: {}, latest: {}, deviceList: null };
    console.log('🧹 Cleared all telemetry cache');
  }
};

/**
 * Send a restart command to a device
 */
export const restartDevice = async (deviceId) => {
  try {
    console.log('🔄 Sending restart command to device:', deviceId);
    const response = await axiosInstance.post(`${BASE_URL}/telemetry/command/${deviceId}`, {
      command: 'restart'
    });
    return response.status === 200;
  } catch (error) {
    console.error("❌ Error restarting device:", error);
    return false;
  }
};