import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Layout from "../components/Layout";
import {
  getDevices,
  addDevice,
  deleteDevice,
  getParentDevices,
  getChildDevices,
  updateDevice,
  getChildDeviceCount,
} from "../services/deviceService";

const DeviceDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [deviceName, setDeviceName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [macId, setMacId] = useState("");
  const [commissionedDate, setCommissionedDate] = useState("");
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState("");

  const [deviceType, setDeviceType] = useState("Parent");
  const [parentDeviceId, setParentDeviceId] = useState("");
  const [parentDevices, setParentDevices] = useState([]);
 
  // For tracking child devices and UI state
  const [childDevices, setChildDevices] = useState({});
  const [openChildRows, setOpenChildRows] = useState({});
  const [childCounts, setChildCounts] = useState({});
 
  // Edit device state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editDeviceName, setEditDeviceName] = useState("");
  const [editSerialNumber, setEditSerialNumber] = useState("");
  const [editMacId, setEditMacId] = useState("");
  const [editCommissionedDate, setEditCommissionedDate] = useState("");
  const [editParentDeviceId, setEditParentDeviceId] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/api/plants").then((res) => {
      setPlants(res.data);
    });
  }, []);

  const fetchDevices = async () => {
    try {
      if (!selectedPlantId) return;
     
      // Get parent devices
      const parentResponse = await getParentDevices(selectedPlantId);
      setDevices(parentResponse);
     
      // Reset child devices
      setChildDevices({});
      setOpenChildRows({});
     
      // Fetch child counts for all parent devices
      const counts = {};
      for (const device of parentResponse) {
        const count = await getChildDeviceCount(device._id);
        counts[device._id] = count;
      }
      setChildCounts(counts);
     
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    if (selectedPlantId) {
      fetchDevices();
    } else {
      setDevices([]);
      setChildCounts({});
    }
  }, [selectedPlantId]);

  useEffect(() => {
    const fetchParents = async () => {
      if (selectedPlantId && deviceType === "Child") {
        try {
          const response = await getParentDevices(selectedPlantId);
          setParentDevices(response);
        } catch (error) {
          console.error("Error fetching parent devices:", error);
        }
      } else {
        setParentDevices([]);
        setParentDeviceId("");
      }
    };

    fetchParents();
  }, [selectedPlantId, deviceType]);

  const fetchChildDevices = async (parentId) => {
    try {
      const children = await getChildDevices(parentId);
      setChildDevices(prev => ({
        ...prev,
        [parentId]: children
      }));
     
      // Update child count
      setChildCounts(prev => ({
        ...prev,
        [parentId]: children.length
      }));
     
      return children;
    } catch (error) {
      console.error("Error fetching child devices:", error);
      return [];
    }
  };

  const toggleChildDevices = async (parentId) => {
    // If already open, just close it
    if (openChildRows[parentId]) {
      setOpenChildRows(prev => ({
        ...prev,
        [parentId]: false
      }));
      return;
    }
   
    // If not loaded yet, fetch them
    if (!childDevices[parentId]) {
      await fetchChildDevices(parentId);
    }
   
    // Open the row
    setOpenChildRows(prev => ({
      ...prev,
      [parentId]: true
    }));
  };

  const handleAddDevice = async () => {
    if (!selectedPlantId || !deviceName || !serialNumber || !macId || !commissionedDate) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      const azureResponse = await axios.post("http://localhost:5000/api/azure/register-device", {
        deviceId: serialNumber,
      });

      console.log("Azure IoT Hub Response:", azureResponse.data);

      await addDevice({
        deviceName,
        serialNumber,
        macId,
        commissionedDate,
        plantId: selectedPlantId,
        parentDeviceId: deviceType === "Child" ? parentDeviceId : null,
      });

      // Reset fields
      setDeviceName("");
      setSerialNumber("");
      setMacId("");
      setCommissionedDate("");
      setDeviceType("Parent");
      setParentDeviceId("");

      // Refresh device list
      fetchDevices();
     
      // If we added a child device, refresh its parent's children
      if (deviceType === "Child" && parentDeviceId) {
        fetchChildDevices(parentDeviceId);
      }
    } catch (error) {
      console.error("Error adding device:", error);
      alert("Failed to add device. Please try again.");
    }
  };

  const handleDeleteDevice = async (id) => {
    try {
      await deleteDevice(id);
      fetchDevices();
    } catch (error) {
      console.error("Error deleting device:", error);
      alert("Failed to delete device.");
    }
  };

  const getChildCount = (deviceId) => {
    return childCounts[deviceId] || 0;
  };
 
  // Open edit dialog and set edit state
  const handleOpenEditDialog = (device, isChild = false) => {
    setEditDevice(device);
    setEditDeviceName(device.deviceName);
    setEditSerialNumber(device.serialNumber);
    setEditMacId(device.macId);
    setEditCommissionedDate(new Date(device.commissionedDate).toISOString().split('T')[0]);
   
    if (isChild) {
      setEditParentDeviceId(device.parentDeviceId);
    } else {
      setEditParentDeviceId("");
    }
   
    setEditDialogOpen(true);
  };
 
  // Close edit dialog and reset state
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditDevice(null);
  };
 
  // Save edited device
  const handleSaveEdit = async () => {
    if (!editDevice || !editDeviceName || !editSerialNumber || !editMacId || !editCommissionedDate) {
      alert("Please fill out all required fields.");
      return;
    }
   
    try {
      const updatedData = {
        deviceName: editDeviceName,
        serialNumber: editSerialNumber,
        macId: editMacId,
        commissionedDate: editCommissionedDate,
      };
     
      // If this is a child device, include the parent ID
      if (editParentDeviceId) {
        updatedData.parentDeviceId = editParentDeviceId;
      }
     
      await updateDevice(editDevice._id, updatedData);
     
      // Refresh device list
      fetchDevices();
     
      // If we edited a child device, refresh its parent's children
      if (editDevice.parentDeviceId) {
        fetchChildDevices(editDevice.parentDeviceId);
      }
     
      handleCloseEditDialog();
    } catch (error) {
      console.error("Error updating device:", error);
      alert("Failed to update device.");
    }
  };

  const dashboardContent = (
    <>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Device Management
      </Typography>

      {/* Select Plant */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6">Select Plant</Typography>
        <Select
          fullWidth
          value={selectedPlantId}
          onChange={(e) => setSelectedPlantId(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">-- Select Plant --</MenuItem>
          {plants.map((plant) => (
            <MenuItem key={plant._id} value={plant._id}>
              {plant.plantName}
            </MenuItem>
          ))}
        </Select>
      </Paper>

      {/* Add Device Form */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Device
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Box>
            <Select
              size="small"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              sx={{ minWidth: "120px" }}
            >
              <MenuItem value="Parent">Parent</MenuItem>
              <MenuItem value="Child">Child</MenuItem>
            </Select>
          </Box>

          {deviceType === "Child" && (
            <Box>
              <Select
                size="small"
                value={parentDeviceId}
                onChange={(e) => setParentDeviceId(e.target.value)}
                displayEmpty
                sx={{ minWidth: "200px" }}
              >
                <MenuItem value="">Select Parent Device</MenuItem>
                {parentDevices.map((device) => (
                  <MenuItem key={device._id} value={device._id}>
                    {device.deviceName}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          <TextField
            label="Device Name"
            variant="outlined"
            size="small"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
          <TextField
            label="Serial Number"
            variant="outlined"
            size="small"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
          <TextField
            label="MAC ID"
            variant="outlined"
            size="small"
            value={macId}
            onChange={(e) => setMacId(e.target.value)}
          />
          <TextField
            label="Commissioned Date"
            type="date"
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={commissionedDate}
            onChange={(e) => setCommissionedDate(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddDevice}
          >
            ADD DEVICE
          </Button>
        </Box>
      </Paper>

      {/* Device Table */}
      {devices.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#0d47a1" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Device Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Serial Number</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>MAC ID</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Commissioned Date</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Child Devices</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Edit</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <React.Fragment key={device._id}>
                  <TableRow>
                    <TableCell>{device.deviceName}</TableCell>
                    <TableCell>{device.serialNumber}</TableCell>
                    <TableCell>{device.macId}</TableCell>
                    <TableCell>
                      {new Date(device.commissionedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => toggleChildDevices(device._id)}
                        variant="outlined"
                        size="small"
                        endIcon={openChildRows[device._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      >
                        {getChildCount(device._id)} CHILD
                      </Button>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenEditDialog(device)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteDevice(device._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                 
                  {/* Child Devices Row */}
                  {openChildRows[device._id] && (
                    <TableRow>
                      <TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
                        <Collapse in={openChildRows[device._id]} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Child Devices
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Device Name</TableCell>
                                  <TableCell>Serial Number</TableCell>
                                  <TableCell>MAC ID</TableCell>
                                  <TableCell>Commissioned Date</TableCell>
                                  <TableCell>Edit</TableCell>
                                  <TableCell>Delete</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {childDevices[device._id]?.length > 0 ? (
                                  childDevices[device._id].map((child) => (
                                    <TableRow key={child._id}>
                                      <TableCell>{child.deviceName}</TableCell>
                                      <TableCell>{child.serialNumber}</TableCell>
                                      <TableCell>{child.macId}</TableCell>
                                      <TableCell>
                                        {new Date(child.commissionedDate).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        <IconButton onClick={() => handleOpenEditDialog(child, true)}>
                                          <EditIcon />
                                        </IconButton>
                                      </TableCell>
                                      <TableCell>
                                        <IconButton
                                          color="error"
                                          onClick={() => handleDeleteDevice(child._id)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={6}>No child devices found</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        selectedPlantId && (
          <Typography variant="body1" mt={2}>
            No devices added for this plant yet.
          </Typography>
        )
      )}
      
      {/* Edit Device Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Device</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, minWidth: "400px" }}>
            <TextField
              label="Device Name"
              fullWidth
              value={editDeviceName}
              onChange={(e) => setEditDeviceName(e.target.value)}
            />
            <TextField
              label="Serial Number"
              fullWidth
              value={editSerialNumber}
              onChange={(e) => setEditSerialNumber(e.target.value)}
            />
            <TextField
              label="MAC ID"
              fullWidth
              value={editMacId}
              onChange={(e) => setEditMacId(e.target.value)}
            />
            <TextField
              label="Commissioned Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={editCommissionedDate}
              onChange={(e) => setEditCommissionedDate(e.target.value)}
            />
           
            {/* Parent device selection for child devices */}
            {editDevice?.parentDeviceId && (
              <Select
                value={editParentDeviceId}
                onChange={(e) => setEditParentDeviceId(e.target.value)}
                displayEmpty
                fullWidth
              >
                <MenuItem value="">No Parent (Convert to Parent Device)</MenuItem>
                {parentDevices.map((device) => (
                  <MenuItem
                    key={device._id}
                    value={device._id}
                    disabled={device._id === editDevice?._id} // Can't set itself as parent
                  >
                    {device.deviceName}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  return (
  <>
      {dashboardContent}
    </>
  );
};

export default DeviceDashboard;