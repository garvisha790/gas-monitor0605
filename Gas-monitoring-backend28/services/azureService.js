const iothub = require("azure-iothub");

// Your Azure IoT Hub Connection String
const connectionString = process.env.IOT_HUB_CONNECTION_STRING;
const registry = iothub.Registry.fromConnectionString(connectionString);

// Function to register or update a device in Azure IoT Hub
const registerDeviceInAzure = async (deviceId) => {
  const device = { deviceId };

  try {
    // Try to create the device
    await registry.create(device);
    return {
      success: true,
      message: `Device ${deviceId} registered successfully in Azure IoT Hub.`
    };
  } catch (error) {
    if (error.code === 409) {
      // Device already exists, perform update instead
      try {
        await registry.update(device);
        return {
          success: true,
          message: `Device ${deviceId} already existed and was updated in Azure IoT Hub.`
        };
      } catch (updateError) {
        return {
          success: false,
          message: `Device ${deviceId} already exists but update failed: ${updateError.message}`
        };
      }
    } else {
      // Some other error occurred
      return {
        success: false,
        message: `Error registering device ${deviceId}: ${error.message}`
      };
    }
  }
};

module.exports = { registerDeviceInAzure };
