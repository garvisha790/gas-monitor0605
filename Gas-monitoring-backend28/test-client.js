const WebSocket = require('ws');

// Parse command line arguments for device ID
const args = process.argv.slice(2);
const deviceId = args[0]; // Optional device ID to subscribe to specific device

// Connect to the WebSocket server as a consumer
let wsUrl = 'ws://localhost:5000/ws?clientType=consumer';
if (deviceId) {
  wsUrl += `&deviceId=${deviceId}`;
  console.log(`Subscribing to specific device: ${deviceId}`);
} else {
  console.log('Subscribing to all devices');
}

const ws = new WebSocket(wsUrl);

// Handle connection open
ws.on('open', () => {
  console.log('Connected to WebSocket server as consumer');
});

// Handle messages from server
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    if (message.type === 'connection') {
      console.log('Connection confirmed:', message);
    } else if (message.type === 'telemetry') {
      console.log(`\n📊 TELEMETRY from ${message.device || 'unknown device'}:`);
      console.log(`  Temperature: ${message.temperature}°C`);
      console.log(`  Humidity: ${message.humidity}%`);
      console.log(`  Oil Level: ${message.oilLevel}%`);
      console.log(`  Timestamp: ${message.timestamp}\n`);
    } else if (message.type === 'alarm') {
      console.log(`\n🚨 ALARM from ${message.device || 'unknown device'}:`);
      if (message.alerts && message.alerts.length > 0) {
        message.alerts.forEach(alert => {
          console.log(`  Code: ${alert.code}`);
          console.log(`  Description: ${alert.desc}`);
          console.log(`  Value: ${alert.value}`);
        });
      }
      console.log(`  Timestamp: ${message.timestamp}\n`);
    } else {
      console.log('Received unknown message type:', message);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle connection close
ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});

console.log('WebSocket client running. Press Ctrl+C to exit.');
