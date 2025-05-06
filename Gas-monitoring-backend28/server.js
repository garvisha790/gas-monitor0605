require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");

const { connectDB } = require("./config/db");

// Route imports - wait for database before importing
let authRoutes, plantRoutes, deviceRoutes, telemetryRoutes, azureDeviceRoutes, alarmRoutes;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize routes only after database connections are established
const initializeRoutes = () => {
  // Now import all route files after DB connections are ready
  authRoutes = require("./routes/authRoutes");
  plantRoutes = require("./routes/plantRoutes");
  deviceRoutes = require("./routes/deviceRoutes");
  telemetryRoutes = require("./routes/telemetryRoutes");
  azureDeviceRoutes = require("./routes/azureDevice");
  alarmRoutes = require("./routes/alarmRoutes");
  
  // Set up routes
  app.use("/api/auth", authRoutes);
  app.use("/api/plants", plantRoutes);
  app.use("/api/devices", deviceRoutes);
  app.use("/api/telemetry", telemetryRoutes);
  app.use("/api/azure", azureDeviceRoutes);
  app.use("/api/alarms", alarmRoutes);
};

// Connect to multiple MongoDB databases (test and oxygen_monitor)
connectDB()
  .then(() => {
    console.log("✅ Databases initialized successfully!");
    
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
    });
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err);
    process.exit(1);
  });

// Default route for API health check
app.get("/", (req, res) => {
  res.json({ status: "API is running", message: "Gas Monitoring Backend" });
});
