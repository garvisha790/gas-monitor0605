const getTelemetryDataByDeviceName = async (deviceName , container) => {
  console.log(`DeviceName: ${deviceName}`);
  console.log(`Container: ${container}`);
  try {
      if (!container) {
          console.error("❌ Container not initialized. Call connectCosmosDB() first.");
          return [];
      }

  
      const querySpec = {
          query: "SELECT * FROM c WHERE c.device = @deviceName AND c.temperature>=0 OR c.temperature<0 AND c.humidity>=0 AND c.oilLevel>=0 ORDER BY c.timestamp DESC",
          parameters: [{ name: "@deviceName", value: deviceName }]
      };
      const { resources } = await container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? resources[0] : null;
  } catch (error) {
      console.error("❌ Error Fetching Telemetry Data:", error.message);
      return null;
  }
};

module.exports = { getTelemetryDataByDeviceName };
