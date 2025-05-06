const { CosmosClient } = require("@azure/cosmos");

// Load CosmosDB Configuration from Environment Variables
const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const databaseId = process.env.COSMOSDB_DATABASE;
const containerId = process.env.COSMOSDB_CONTAINER;

// Check if credentials are properly set
if (!endpoint || !key || !databaseId || !containerId) {
    console.error("❌ CosmosDB Configuration Missing! Check environment variables.");
}

// Initialize Cosmos Client
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

const connectCosmosDB = async () => {
    console.log("✅ CosmosDB Client initialized and ready.");
    return true;
};
// 🛠 **Fetch telemetry data for a given device name**
const fetchTelemetryDataByDeviceName = async (deviceName, limit = 20) => {
    try {
        console.log(`📡 Fetching telemetry data for device: ${deviceName}`);

        const query = {
            query: `SELECT TOP @limit * FROM c WHERE c.device = @deviceName ORDER BY c._ts DESC`,
            parameters: [
                { name: "@deviceName", value: deviceName },
                { name: "@limit", value: limit }
            ]
        };

        const { resources: telemetryData } = await container.items.query(query).fetchAll();

        if (!telemetryData.length) {
            console.warn(`⚠️ No telemetry data found for device: ${deviceName}`);
            return [];
        }

        return telemetryData.map(data => ({
            timestamp: new Date(data._ts * 1000).toISOString(),
            temperature: data.temperature || data.temp || 0,
            humidity: data.humidity || data.humid || 0,
            oilLevel: data.oil_level || data.oilLevel || 0,
            openAlerts: data.open_alerts || data.alerts || 0
        }));
    } catch (error) {
        console.error(`❌ Error fetching telemetry for device: ${deviceName}`, error);
        return [];
    }
};

// 🛠 **Fetch latest telemetry entry**
const fetchLatestTelemetryByDeviceName = async (deviceName) => {
    const result = await fetchTelemetryDataByDeviceName(deviceName, 1);
    return result.length ? result[0] : null;
};

// 🛠 **Fetch diagnostic data (All records, limited to 100)**
const fetchDiagnosticData = async () => {
    try {
        console.log("🔍 Running CosmosDB diagnostic...");

        const query = {
            query: "SELECT TOP 100 * FROM c ORDER BY c._ts DESC"
        };

        const { resources: allData } = await container.items.query(query).fetchAll();

        const countQuery = { query: "SELECT VALUE COUNT(1) FROM c" };
        const { resources: countResult } = await container.items.query(countQuery).fetchAll();
        const totalCount = countResult.length ? countResult[0] : 0;

        console.log(`📊 Found ${allData.length} records, Total Count: ${totalCount}`);

        return {
            totalRecords: totalCount,
            data: allData
        };
    } catch (error) {
        console.error("❌ Error in diagnostic data fetch:", error);
        return { error: error.message };
    }
};

// 🛠 **Fetch all unique device names**
const fetchUniqueDeviceNames = async () => {
    try {
        const query = { query: "SELECT DISTINCT VALUE c.device FROM c" };
        const { resources: deviceNames } = await container.items.query(query).fetchAll();
        return deviceNames;
    } catch (error) {
        console.error("❌ Error fetching unique device names:", error);
        return [];
    }
};

// Export functions
module.exports = {
    fetchTelemetryDataByDeviceName,
    fetchLatestTelemetryByDeviceName,
    fetchDiagnosticData,
    fetchUniqueDeviceNames,
    connectCosmosDB // 👈 add this
};
