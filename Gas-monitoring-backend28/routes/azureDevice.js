const express = require("express");
const router = express.Router();
const { registerDeviceInAzure } = require("../services/azureService");

// Register a new device in Azure IoT Hub
router.post("/register-device", async (req, res) => {
  console.log("Registering device in Azure IoT Hub...");
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request IP:", req.ip);
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, message: "Device ID is required" });
  }

  try {
    const response = await registerDeviceInAzure(deviceId);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error registering device in Azure:", error?.responseBody || error.message || error);

    let errorMessage = "Azure IoT Hub registration failed.";
    let details = {};

    // If Azure returned a response body with a readable message
    if (error.responseBody) {
      try {
        details = JSON.parse(error.responseBody);
      } catch (parseError) {
        details = { raw: error.responseBody };
      }
    } else {
      details = { message: error.message || String(error) };
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: details,
    });
  }
});

module.exports = router;
