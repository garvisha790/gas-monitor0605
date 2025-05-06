import React, { useEffect, useState, useCallback } from "react";
import { getPlants } from "../services/plantService";
import { getDevices } from "../services/deviceService";
import { getThresholdValue, updateThresholdValue, getToleranceValue, updateToleranceValue } from '../services/telemetryService';
import axios from 'axios';
import Layout from "../components/Layout";
import AlarmsTab from '../components/siteView/AlarmsTab';
import { useLocation, useNavigate } from 'react-router-dom';


import { 
  getLatestTelemetryEntry, 
  getRealtimeTelemetryData, 
  getTelemetryData,
  clearDeviceCache,
  restartDevice
} from "../services/telemetryService";
import { Line } from "react-chartjs-2";
import TextField from '@mui/material/TextField';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
);

import {
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Button,
  Grid,
  Divider,
  TableContainer,
  Tabs,
  Tab
} from "@mui/material";

import { useTheme } from '@mui/material/styles';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
 
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Custom circular progress visualization component that matches the reference UI
const MetricCircle = ({ value, label, color, size = 100, thickness = 5 }) => {
  const theme = useTheme();
  const displayValue = value || 0;
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      m: 2
    }}>
      <Box sx={{ 
        position: 'relative', 
        display: 'inline-flex',
        mb: 1
      }}>
        <CircularProgress
          variant="determinate"
          value={100} // Fixed angle for the visual style
          size={size}
          thickness={thickness}
          sx={{ 
            color: color || theme.palette.primary.main,
            transform: 'rotate(135deg)',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" component="div" fontWeight="bold">
            {displayValue}
            {label === 'Temperature' ? '°C' : label === 'Humidity' || label === 'Oil Level' ? '%' : ''}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body1" component="div">
        {label}
      </Typography>
    </Box>
  );
};

const TelemetryDashboard = () => {
  const [selectedConfigType, setSelectedConfigType] = useState('');
  const [selectedCommandType, setSelectedCommandType] = useState("");
  const [liveCommandValue, setLiveCommandValue] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [currentThreshold, setCurrentThreshold] = useState('');
  const [threshold, setThreshold] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  
  // For tolerance values
  const [selectedToleranceMetric, setSelectedToleranceMetric] = useState('');
  const [currentTolerance, setCurrentTolerance] = useState('');
  const [newTolerance, setNewTolerance] = useState('');
  
  const theme = useTheme();
  const location = useLocation();
  const [plants, setPlants] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("esp32");
  const [telemetryData, setTelemetryData] = useState([]);
  const [latestEntry, setLatestEntry] = useState(null);
  const [localAlarmCount, setLocalAlarmCount] = useState(0);
  const [realtimeData, setRealtimeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Get tab from URL or use default
  const tabFromURL = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState('status'); // default is 'status'

  // Update active tab based on URL when component mounts or URL changes
  useEffect(() => {
    if (tabFromURL) {
      setActiveTab(tabFromURL);
    }
  }, [tabFromURL]);

  // Get location search parameters (if any)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);
  
  // Fetch alarm count from the backend
  useEffect(() => {
    const fetchAlarmCount = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/alarms');
        const alarms = response.data;
        setLocalAlarmCount(alarms.length);
      } catch (error) {
        console.error('Error fetching alarm count:', error);
      }
    };
    
    fetchAlarmCount();
    // Set up interval to refresh alarm count
    const interval = setInterval(fetchAlarmCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const params = new URLSearchParams(location.search);
    params.set('tab', newValue);
    navigate({ search: params.toString() });
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };
  
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setLoading(true);
        const plantData = await getPlants();
        setPlants(plantData);
        if (plantData.length > 0) {
          setSelectedPlant(plantData[0]._id);
        }
      } catch (error) {
        console.error("❌ Error fetching plants:", error);
        setError("Failed to load plants. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlants();
  }, []); // Run only once on mount
  

  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedPlant) {
        return;
      }
     
      try {
        setLoading(true);
        const deviceData = await getDevices(selectedPlant);
        setDevices(deviceData);
        if (deviceData.length > 0) {
          setSelectedDevice(deviceData[0]._id); // Use deviceId
        }
      } catch (error) {
        console.error("❌ Error fetching devices:", error);
        setError("Failed to load devices. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchDevices();
  }, [selectedPlant]); // Fetch devices when the plant selection changes
  
  const fetchLatestEntry = useCallback(async () => {
    if (!selectedDevice) return;
  
    try {
      const data = await getLatestTelemetryEntry(selectedDevice);
      console.log("Latest telemetry entry:", data);
      if (data) {
        // Properly normalize the data structure
        const normalized = {
          alerts: Array.isArray(data.alerts) ? data.alerts : [],
          temperature: typeof data.temperature === 'object' ? 
            data.temperature.value : 
            typeof data.temperature === 'number' ? 
              data.temperature : 0,
          humidity: typeof data.humidity === 'object' ? 
            data.humidity.value : 
            typeof data.humidity === 'number' ? 
              data.humidity : 0,
          oilLevel: typeof data.oilLevel === 'object' ? 
            data.oilLevel.value : 
            typeof data.oilLevel === 'number' ? 
              data.oilLevel : 0
        };

        console.log("Normalized latest entry:", normalized);
        setLatestEntry(normalized);
        setConnectionStatus("connected");
      } else {
        setLatestEntry(null);
        setConnectionStatus("no data");
      }
    } catch (error) {
      console.error("❌ Error fetching latest telemetry:", error);
      setLatestEntry(null);
      setConnectionStatus("error");
    }
  }, [selectedDevice]);

  const fetchRealtimeData = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const data = await getRealtimeTelemetryData(selectedDevice);
      setRealtimeData(data);
    } catch (error) {
      console.error("❌ Error fetching realtime data:", error);
      setRealtimeData([]);
    }
  }, [selectedDevice]);
  
  const fetchHistoricalData = useCallback(async () => {
    if (!selectedDevice) {
      setTelemetryData([]);
      return;
    }
   
    try {
      const data = await getTelemetryData(selectedDevice);
      if (data?.length > 0) {
        const processedData = data.map(entry => ({
          ...entry,
          temperature: entry.temperature?.value || entry.temperature || 0,
          oilLevel: entry.oilLevel?.value || entry.oilLevel || 0,
          timestamp: entry.timestamp
        }));
        
        setTelemetryData(processedData.slice(0, 20));
        setError(null);
      }
    } catch (error) {
      console.error("❌ Error fetching historical data:", error);
      setError("Failed to fetch telemetry data.");
    }
  }, [selectedDevice]);
  
  useEffect(() => {
    const fetchThreshold = async () => {
      if (selectedDevice && selectedConfigType) {
        const threshold = await getThresholdValue(selectedDevice, selectedConfigType.toLowerCase());
        setCurrentThreshold(threshold);
      }
    };
    fetchThreshold();
  }, [selectedDevice, selectedConfigType]);

  const handleThresholdUpdate = async () => {
    if (!selectedMetric || !newThreshold || isNaN(newThreshold)) {
      alert("Please select a metric and enter a valid number");
      return;
    }
    
    try {
      const success = await updateThresholdValue(selectedDevice, selectedMetric, parseFloat(newThreshold));
      
      if (success) {
        alert(`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} threshold updated successfully!`);
        setCurrentThreshold(newThreshold);
        setNewThreshold('');
        // Reset the dropdown selection to allow selecting other parameters
        setTimeout(() => {
          // Brief delay to prevent React state update conflicts
          setSelectedMetric('');
        }, 100);
      } else {
        alert("Failed to update threshold. Try again.");
      }
    } catch (error) {
      console.error("Error updating threshold:", error);
      alert("Failed to update threshold. Try again.");
    }
  };

  const handleRestartDevice = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }
    
    if (window.confirm(`Are you sure you want to restart this device?`)) {
      try {
        const success = await restartDevice(selectedDevice);
        
        if (success) {
          alert("Restart command sent successfully!");
        } else {
          alert("Failed to restart device. Try again.");
        }
      } catch (error) {
        console.error("Error restarting device:", error);
        alert("Failed to restart device. Try again.");
      }
    }
  };
  
  useEffect(() => {
    if (!selectedDevice) return;

    // Initial data fetch - all at once
    Promise.all([
      fetchLatestEntry(),
      fetchRealtimeData(),
      fetchHistoricalData()
    ]).then(() => {
      setLoading(false);
    });

    // Optimize intervals for better UX:
    // - Faster initial updates
    // - Longer display time for readability
    // - Staggered updates to prevent simultaneous fetches
    const latestInterval = setInterval(fetchLatestEntry, 3000);    // Every 3 seconds
    const realtimeInterval = setInterval(fetchRealtimeData, 5000); // Every 5 seconds
    const historicalInterval = setInterval(fetchHistoricalData, 15000); // Every 15 seconds

    return () => {
      clearInterval(latestInterval);
      clearInterval(realtimeInterval);
      clearInterval(historicalInterval);
    };
  }, [selectedDevice, fetchLatestEntry, fetchRealtimeData, fetchHistoricalData]);
  
  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedDevice("");
    clearDeviceCache();
  };
  
  const debouncedLoading = useCallback((value) => {
    setTimeout(() => setLoading(value), value ? 0 : 300);
  }, []);

  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    debouncedLoading(true);
    setSelectedDevice(newDeviceId);
    clearDeviceCache(newDeviceId);
    
    // Reset data states when device changes
    setTelemetryData([]);
    setRealtimeData([]);
    setLatestEntry(null);
    setError(null);
  };
  
  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "disconnected": return "Disconnected";
      case "error": return "Connection Error";
      case "no data": return "No data available";
      default: return "Unknown";
    }
  };
  console.log("LAtest Entry:", latestEntry);
  const renderAlarmsTab = () => {
    return (
      <>
        {/* Only display '0 Open Alerts' when there are actually no alarms */}
        {localAlarmCount === 0 && (
          <Box sx={{ textAlign: 'center', py: 2, mb: 2 }}>
            <Typography variant="h6">
              0 Open Alerts
            </Typography>
          </Box>
        )}
        
        {/* Render the actual AlarmsTab component */}
        <AlarmsTab />
      </>
    );
  };

  // Fetch threshold value when a metric is selected
  useEffect(() => {
    if (selectedDevice && selectedMetric) {
      fetchThresholdValue();
    }
  }, [selectedDevice, selectedMetric]);
  
  // Fetch tolerance value when tolerance metric is selected
  useEffect(() => {
    if (selectedDevice && selectedToleranceMetric) {
      fetchToleranceValue();
    }
  }, [selectedDevice, selectedToleranceMetric]);
  
  // Fetch the current threshold value for the selected device and metric
  const fetchThresholdValue = async () => {
    try {
      const value = await getThresholdValue(selectedDevice, selectedMetric);
      setCurrentThreshold(value ? value.toString() : '');
    } catch (error) {
      console.error("Error fetching threshold:", error);
    }
  };
  
  // Fetch the current tolerance value for the selected device and metric
  const fetchToleranceValue = async () => {
    try {
      const value = await getToleranceValue(selectedDevice, selectedToleranceMetric);
      setCurrentTolerance(value ? value.toString() : '');
    } catch (error) {
      console.error("Error fetching tolerance:", error);
    }
  };
  
  // Handle tolerance update
  const handleToleranceUpdate = async () => {
    if (!selectedDevice || !selectedToleranceMetric || !newTolerance) return;
    
    try {
      const success = await updateToleranceValue(selectedDevice, selectedToleranceMetric, parseFloat(newTolerance));
      
      if (success) {
        setCurrentTolerance(newTolerance);
        setNewTolerance('');
        alert(`${selectedToleranceMetric.charAt(0).toUpperCase() + selectedToleranceMetric.slice(1)} tolerance updated successfully!`);
        // Reset the dropdown selection to allow selecting other parameters
        setTimeout(() => {
          // Brief delay to prevent React state update conflicts
          setSelectedToleranceMetric('');
        }, 100);
      } else {
        alert("Failed to update tolerance. Try again.");
      }
    } catch (error) {
      console.error("Error updating tolerance:", error);
      alert("Failed to update tolerance. Try again.");
    }
  };
  
  // Render the command center tab content
  const renderCommandCenterTab = () => (
    <Box>
      {/* Threshold Section Header */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Threshold Settings
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Dropdown to choose metric for threshold */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metric for Threshold</InputLabel>
        <Select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          label="Select Metric for Threshold"
        >
          <MenuItem value="temperature">Temperature</MenuItem>
          <MenuItem value="humidity">Humidity</MenuItem>
          <MenuItem value="oilLevel">Oil Level</MenuItem>
        </Select>
      </FormControl>

      {/* Show current threshold */}
      {currentThreshold !== null && selectedMetric && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            Current Threshold for {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: <strong>{currentThreshold}</strong>
          </Typography>
        </Box>
      )}

      {/* Input to update threshold */}
      <TextField
        label="New Threshold Value"
        variant="outlined"
        fullWidth
        value={newThreshold}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*\.?\d*$/.test(value)) {
            setNewThreshold(value); // Only numbers allowed
          }
        }}
        sx={{ mb: 2 }}
      />

      {/* Update Threshold Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={handleThresholdUpdate}
        disabled={!selectedMetric || !newThreshold}
        sx={{ mb: 2 }}
      >
        Update Threshold
      </Button>
      
      {/* Tolerance Section Header */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Tolerance Settings
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Dropdown to choose tolerance metric */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metric for Tolerance</InputLabel>
        <Select
          value={selectedToleranceMetric}
          onChange={(e) => setSelectedToleranceMetric(e.target.value)}
          label="Select Metric for Tolerance"
        >
          <MenuItem value="temperature">Temperature</MenuItem>
          <MenuItem value="humidity">Humidity</MenuItem>
          <MenuItem value="oilLevel">Oil Level</MenuItem>
        </Select>
      </FormControl>
      
      {/* Show current tolerance */}
      {currentTolerance !== null && selectedToleranceMetric && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            Current Tolerance for {selectedToleranceMetric.charAt(0).toUpperCase() + selectedToleranceMetric.slice(1)}: <strong>{currentTolerance}</strong>
          </Typography>
        </Box>
      )}

      {/* Input to update tolerance */}
      <TextField
        label="New Tolerance Value"
        variant="outlined"
        fullWidth
        value={newTolerance}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*\.?\d*$/.test(value)) {
            setNewTolerance(value); // Only numbers allowed
          }
        }}
        sx={{ mb: 2 }}
      />

      {/* Update Tolerance Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={handleToleranceUpdate}
        disabled={!selectedToleranceMetric || !newTolerance}
        sx={{ mb: 2 }}
      >
        Update Tolerance
      </Button>

      {/* Restart Device Button */}
      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={handleRestartDevice}
      >
        Restart Device
      </Button>
    </Box>
  );
  
  const renderDeviceMetrics = () => {
    if (!latestEntry) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No telemetry data available for this device. Please check MongoDB connection.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            If this is a real device and data exists in MongoDB, check that device IDs match between the frontend and database.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Device Metrics
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          flexWrap: 'wrap',
          mb: 3 
        }}>
          <MetricCircle 
            value={latestEntry.alerts?.length || 0}
            label="Open Alerts" 
            color="#f44336"
          />
          <MetricCircle 
            value={Number(latestEntry.temperature).toFixed(1)}
            label="Temperature" 
            color="#ff9800"
          />
          <MetricCircle 
            value={Number(latestEntry.humidity).toFixed(1)}
            label="Humidity" 
            color="#2196f3"
          />
          <MetricCircle 
            value={Number(latestEntry.oilLevel).toFixed(1)}
            label="Oil Level" 
            color="#4caf50"
          />
        </Box>
      </Box>
    );
  };

  const temperatureChartData = {
    labels: telemetryData?.map(entry => new Date(entry.timestamp).toLocaleTimeString()) || [],
    datasets: [{
      label: 'Temperature',
      data: telemetryData?.map(entry => {
        if (typeof entry.temperature === 'object') {
          return entry.temperature.value || 0;
        }
        return entry.temperature || 0;
      }) || [],
      borderColor: '#ff9800',
      tension: 0.1
    }]
  };
  
  const oilLevelChartData = {
    labels: telemetryData?.map(entry => new Date(entry.timestamp).toLocaleTimeString()) || [],
    datasets: [{
      label: 'Oil Level',
      data: telemetryData?.map(entry => {
        if (typeof entry.oilLevel === 'object') {
          return entry.oilLevel.value || 0;
        }
        return entry.oilLevel || 0;
      }) || [],
      borderColor: '#4caf50',
      tension: 0.1
    }]
  };

  // Update the table rendering section in renderCharts
  const renderCharts = () => {
    if (!selectedDevice || realtimeData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 3, mt: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No telemetry data available for this device in MongoDB.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please select a device that has data stored in the MongoDB container.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" mb={1}>Temperature Over Time</Typography>
            <Paper sx={{ p: 2, height: 250 }}>
              <Line data={temperatureChartData} options={chartOptions} />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" mb={1}>Oil Level Over Time</Typography>
            <Paper sx={{ p: 2, height: 250 }}>
              <Line data={oilLevelChartData} options={chartOptions} />
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" mb={1}>Latest Readings</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Temperature (°C)</TableCell>
                  <TableCell>Oil Level (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {telemetryData.length > 0 ? (
                  telemetryData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(item.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {typeof item.temperature === 'object' && item.temperature.value !== undefined
                          ? item.temperature.value
                          : typeof item.temperature === 'number'
                          ? item.temperature
                          : '0'}
                      </TableCell>
                      <TableCell>
                        {typeof item.oilLevel === 'object' && item.oilLevel.value !== undefined
                          ? item.oilLevel.value
                          : typeof item.oilLevel === 'number'
                          ? item.oilLevel
                          : '0'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Waiting for real-time data...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </>
    );
  };

  const dashboardContent = (
    <Container maxWidth="lg" sx={{ mt: 0.6, mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Telemetry Dashboard
      </Typography>
      
      {/* Plant and Device Selection */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="plant-select-label">Select Plant</InputLabel>
            <Select
              labelId="plant-select-label"
              value={selectedPlant}
              onChange={handlePlantChange}
              label="Select Plant"
              disabled={loading}
            >
              {plants.map((plant) => (
                <MenuItem key={plant._id} value={plant._id}>
                  {plant.plantName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }} disabled={!selectedPlant || loading}>
            <InputLabel id="device-select-label">Select Device</InputLabel>
            <Select
              labelId="device-select-label"
              value={selectedDevice}
              onChange={handleDeviceChange}
              label="Select Device"
            >
              {devices.map((device) => (
                <MenuItem key={device._id} value={device._id}>
                  {device.deviceName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Loading indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Tab navigation with new Tabs component */}
      {selectedDevice && !loading && (
        <>
          {/* Using MUI Tabs component instead of custom buttons */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <span>Status</span>
                    {activeTab === "status" && (
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        ({getConnectionStatus()})
                      </Typography>
                    )}
                  </Box>
                } 
                value="status" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <span>Alarms</span>
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      ({localAlarmCount || 0})
                    </Typography>
                  </Box>
                } 
                value="alarms" 
              />
              <Tab label="Command Center" value="cmd" />
            </Tabs>
          </Paper>

          {/* Error message */}
          {error && (
            <Paper 
              sx={{ 
                p: 2, 
                mb: 3, 
                bgcolor: 'error.light', 
                color: 'error.main',
                borderRadius: 1
              }}
            >
              <Typography>{error}</Typography>
            </Paper>
          )}
          
          {/* Tab content */}
          <Box>
            {activeTab === "status" && (
              <>
                {renderDeviceMetrics()}
                {renderCharts()}
              </>
            )}
            
            {activeTab === "alarms" && renderAlarmsTab()}
            
            {activeTab === "cmd" && renderCommandCenterTab()}
          </Box>
        </>
      )}
    </Container>
  );

  return <>{dashboardContent}</>;
};

export default TelemetryDashboard;