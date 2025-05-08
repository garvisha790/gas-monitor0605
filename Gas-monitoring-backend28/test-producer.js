const WebSocket = require('ws');

// Connect to the WebSocket server as a producer
const ws = new WebSocket('ws://localhost:5000/ws?clientType=producer');

// Sample device IDs
const deviceIds = ['device1', 'device2'];

// Handle connection open
ws.on('open', () => {
  console.log('Connected to WebSocket server as producer');
  
  // Send a telemetry message every 5 seconds
  setInterval(() => {
    const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    
    // Simulate telemetry data
    const telemetryData = {
      type: 'telemetry',
      device: deviceId,
      temperature: (Math.random() * 30 + 15).toFixed(1),  // 15-45°C
      humidity: (Math.random() * 60 + 30).toFixed(1),     // 30-90%
      oilLevel: (Math.random() * 100).toFixed(1),         // 0-100%
      timestamp: new Date().toISOString()
    };
    
    // Send telemetry data
    ws.send(JSON.stringify(telemetryData));
    console.log(`Sent telemetry data for ${deviceId}:`, telemetryData);
  }, 5000);
  
  // Send an alarm message every 15 seconds
  setInterval(() => {
    const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    
    // Get a random alarm code
    const alarmCodes = [
      { code: 'IO_ALR_100', desc: 'High Temperature', value: (Math.random() * 10 + 50).toFixed(1) },
      { code: 'IO_ALR_102', desc: 'High Humidity', value: (Math.random() * 10 + 90).toFixed(1) },
      { code: 'IO_ALR_104', desc: 'Low Oil Level', value: (Math.random() * 10).toFixed(1) },
      { code: 'IO_ALR_109', desc: 'Oil Level Critical', value: '0' }
    ];
    
    const alarm = alarmCodes[Math.floor(Math.random() * alarmCodes.length)];
    
    // Simulate alarm data
    const alarmData = {
      type: 'alarm',
      device: deviceId,
      alerts: [
        {
          code: alarm.code,
          desc: alarm.desc,
          value: alarm.value
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Send alarm data
    ws.send(JSON.stringify(alarmData));
    console.log(`Sent alarm data for ${deviceId}:`, alarmData);
  }, 15000);
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle connection close
ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
});

// Handle messages from server
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message from server:', message);
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});
