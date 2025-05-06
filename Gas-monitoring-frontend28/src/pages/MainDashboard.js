import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress
} from "@mui/material";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import WarningIcon from "@mui/icons-material/Warning";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AlarmNotification from "../components/siteView/alarmNotification";

const drawerWidth = 200;

const statusSummary = [
  { label: "Offline", color: "#d4f1f9", count: 0 },
  { label: "Error", color: "#f7d7da", count: 0 },
  { label: "Warning", color: "#fff4d1", count: 0 },
  { label: "Normal", color: "#d4f9d7", count: 0 },
];

const StatusCard = ({ label, color, count }) => (
  <Paper
    elevation={3}
    sx={{
      padding: "16px",
      textAlign: "center",
      width: "140px",
      backgroundColor: color,
      borderRadius: "16px",
    }}
  >
    <Typography variant="subtitle1" fontWeight="bold">
      {label}
    </Typography>
    <Typography variant="h5" fontWeight="bold">
      {count}
    </Typography>
  </Paper>
);

const MainDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const getSelectedLocation = () => [12.9716, 77.5946];

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    handleClose();
  };
  
  // Fetch top 5 alarms from the backend
  useEffect(() => {
    const fetchAlarms = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/alarms');
        // Sort by creation time and take only the first 5
        const sortedAlarms = response.data
          .sort((a, b) => new Date(b.CreatedTimestamp) - new Date(a.CreatedTimestamp))
          .slice(0, 5);
        setAlarms(sortedAlarms);
      } catch (error) {
        console.error('Error fetching alarms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlarms();
    // Refresh alarms every 30 seconds
    const interval = setInterval(fetchAlarms, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: "flex" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "white",
          color: "black",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            sx={{ flexGrow: 1, fontWeight: "bold", textAlign: "center" }}
          >
            Oxygen Plant Monitor
          </Typography>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AlarmNotification />
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircleIcon />
            </IconButton>
          </div>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem disabled>{user?.email || "User"}</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "#ffffff",
          p: 3,
          minHeight: "100vh",
          marginTop: "0.5px",
        }}
      >
        <Grid container spacing={3}>
          {/* Map Section */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ borderRadius: "16px" }}>
              <div style={{ height: "300px", width: "100%" }}>
                <MapContainer
                  center={getSelectedLocation()}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </MapContainer>
              </div>
            </Paper>
          </Grid>

          {/* Status Summary */}
          <Grid item xs={12}>
            <Grid container spacing={2} justifyContent="center">
              {statusSummary.map((item, index) => (
                <Grid item key={index}>
                  <StatusCard
                    label={item.label}
                    color={item.color}
                    count={item.count}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Logs and Alerts */}
          <Grid item xs={6}>
            <Paper
              elevation={3}
              sx={{
                height: "200px",
                padding: "16px",
                backgroundColor: "#e3f2fd",
                borderRadius: "16px",
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                List of Logs (Auto Refresh)
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6}>
            <Paper
              elevation={3}
              sx={{
                height: "300px",
                padding: "16px",
                backgroundColor: "#fce4ec",
                borderRadius: "16px",
                overflow: 'auto'
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top 5 Latest Alerts
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : alarms.length === 0 ? (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                  No alerts found
                </Typography>
              ) : (
                <List>
  {alarms.map((alarm) => (
    <React.Fragment key={alarm._id}>
      <ListItem alignItems="flex-start">
        <ListItemIcon>
          <WarningIcon color="error" />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {alarm.AlarmDescription || 'Unknown Alarm'}, {alarm.AlarmValue} —{" "}
              <Typography variant="caption" component="span" color="text.secondary">
                {new Date(alarm.CreatedTimestamp).toLocaleString()}
              </Typography>
            </Typography>
          }
          secondary={
            <Typography variant="body2" color="text.secondary">
              {alarm.PlantName || 'Unknown Plant'} → {alarm.DeviceName || 'Unknown Device'}
            </Typography>
          }
        />
      </ListItem>
      <Divider component="li" />
    </React.Fragment>
  ))}
</List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MainDashboard;
