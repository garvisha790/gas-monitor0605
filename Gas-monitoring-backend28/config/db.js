const mongoose = require('mongoose');

// Create multiple mongoose connections - one for each database
let testDBConnection;
let telemetryDBConnection;

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI; // Main MongoDB URI

    if (!dbURI) {
      throw new Error("❌ MongoDB URI is missing in .env file!");
    }

    // Extract the base URI without any database specification
    let baseURI = dbURI;
    if (baseURI.includes('/?')) {
      baseURI = baseURI.split('/?')[0];
    } else if (baseURI.includes('?')) {
      baseURI = baseURI.split('?')[0];
    }
    
    // Remove any existing database path
    const lastSlashIndex = baseURI.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      const afterLastSlash = baseURI.substring(lastSlashIndex + 1);
      // Check if there's a database name after the last slash
      if (afterLastSlash && !afterLastSlash.includes(':') && !afterLastSlash.includes('.')) {
        // Remove the existing database name
        baseURI = baseURI.substring(0, lastSlashIndex);
      }
    }

    console.log('Connecting to multiple MongoDB databases...');

    // Create connection to 'test' database for plants, devices, users
    const testDBUri = `${baseURI}/test`;
    testDBConnection = mongoose.createConnection(testDBUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    testDBConnection.on('error', (err) => {
      console.error('❌ Test DB Connection Error:', err);
    });

    testDBConnection.once('open', () => {
      console.log('✅ Connected to MongoDB Test database for plants, devices, and users');
    });

    // Create connection to 'oxygen_monitor' database for telemetry
    const telemetryDBUri = `${baseURI}/oxygen_monitor`;
    telemetryDBConnection = mongoose.createConnection(telemetryDBUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    telemetryDBConnection.on('error', (err) => {
      console.error('❌ Telemetry DB Connection Error:', err);
    });

    telemetryDBConnection.once('open', () => {
      console.log('✅ Connected to MongoDB Oxygen Monitor database for telemetry data');
    });

    // Default connection (for backward compatibility)
    await mongoose.connect(testDBUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    mongoose.connection.on('error', console.error.bind(console, '❌ Default MongoDB connection error:'));
    mongoose.connection.once('open', () => {
      console.log('✅ Default MongoDB connection opened');
    });

    console.log("✅ Successfully connected to all MongoDB databases");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  getTestDB: () => testDBConnection,
  getTelemetryDB: () => telemetryDBConnection
};
