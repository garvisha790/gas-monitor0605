const axios = require('axios');

// Test API endpoints
async function testEndpoints() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    console.log('Testing API health...');
    const health = await axios.get(`${BASE_URL}`);
    console.log('API Health:', health.data);
    
    console.log('\nTesting telemetry endpoints...');
    
    try {
      const latest = await axios.get(`${BASE_URL}/telemetry/latest/esp32`);
      console.log('Latest telemetry:', latest.data);
    } catch (error) {
      console.error('Latest telemetry error:', error.message);
    }
    
    try {
      const realtime = await axios.get(`${BASE_URL}/telemetry/realtime/esp32`);
      console.log('Realtime telemetry:', realtime.data);
    } catch (error) {
      console.error('Realtime telemetry error:', error.message);
    }
    
    try {
      const historical = await axios.get(`${BASE_URL}/telemetry/esp32`);
      console.log('Historical telemetry:', historical.data.length || 'None');
    } catch (error) {
      console.error('Historical telemetry error:', error.message);
    }
    
  } catch (error) {
    console.error('Error testing endpoints:', error.message);
  }
}

testEndpoints();
