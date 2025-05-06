//mongoChangeStream
 
const mongoose = require('mongoose');

let alarmChangeStream = null;
let telemetryChangeStream = null;
 
// Setup change stream to monitor for new alarms
const setupAlarmChangeStream = async (callback) => {
  try {
    console.log('Setting up MongoDB change stream for alarms collection...');

    // Get the MongoDB collection
    const collection = mongoose.connection.collection('alarms');

    // Create a change stream
    alarmChangeStream = collection.watch();

    // Event handler for changes
    alarmChangeStream.on('change', (change) => {
      if (change.operationType === 'insert') {
        console.log(' New alarm detected:', change.fullDocument);
        
        // Call the callback if provided
        if (typeof callback === 'function') {
          callback(change.fullDocument);
        }
      }
    });

    alarmChangeStream.on('error', (error) => {
      console.error(' Error in alarm change stream:', error);
      // Attempt to restart the stream after a delay
      setTimeout(() => setupAlarmChangeStream(callback), 5000);
    });

    console.log(' MongoDB alarm change stream set up successfully');
  } catch (error) {
    console.error(' Error setting up MongoDB alarm change stream:', error);
  }
};

// Setup change stream to monitor for new telemetry data
const setupTelemetryChangeStream = async (callback) => {
  try {
    console.log('Setting up MongoDB change stream for telemetry collection...');

    // Get the MongoDB collection
    const collection = mongoose.connection.collection('telemetry');

    // Create a change stream
    telemetryChangeStream = collection.watch();

    // Event handler for changes
    telemetryChangeStream.on('change', (change) => {
      if (change.operationType === 'insert') {
        console.log(' New telemetry data detected');
        
        // Call the callback if provided
        if (typeof callback === 'function') {
          callback(change.fullDocument);
        }
      }
    });

    telemetryChangeStream.on('error', (error) => {
      console.error(' Error in telemetry change stream:', error);
      // Attempt to restart the stream after a delay
      setTimeout(() => setupTelemetryChangeStream(callback), 5000);
    });

    console.log(' MongoDB telemetry change stream set up successfully');
  } catch (error) {
    console.error(' Error setting up MongoDB telemetry change stream:', error);
  }
};

// Cleanup change streams when no longer needed
const cleanupChangeStreams = async () => {
  if (alarmChangeStream) {
    await alarmChangeStream.close();
    alarmChangeStream = null;
    console.log('Alarm change stream closed');
  }
  
  if (telemetryChangeStream) {
    await telemetryChangeStream.close();
    telemetryChangeStream = null;
    console.log('Telemetry change stream closed');
  }
};
 
module.exports = { 
  setupAlarmChangeStream,
  setupTelemetryChangeStream,
  cleanupChangeStreams
};