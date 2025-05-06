import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  deleteDevice,
  getParentDevices,
  getChildDevices,
} from '../../services/deviceService';
 
const DeviceDetails = ({ siteName, onEdit }) => {
  const [parentDevices, setParentDevices] = useState([]);
  const [childDevices, setChildDevices] = useState({}); // { parentId: [children] }
  const [openChildRows, setOpenChildRows] = useState({}); // { parentId: true/false }
 
  useEffect(() => {
    const fetchParentDevices = async () => {
      try {
        const data = await getParentDevices(siteName);
        setParentDevices(data);
      } catch (error) {
        console.error('Failed to fetch parent devices:', error);
      }
    };
 
    fetchParentDevices();
  }, [siteName]);
 
  const handleDelete = async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      // Refresh parent devices list
      const data = await getParentDevices(siteName);
      setParentDevices(data);
      // Clean up child devices state if needed
      setChildDevices(prev => {
        const newState = { ...prev };
        delete newState[deviceId];
        return newState;
      });
      setOpenChildRows(prev => {
        const newState = { ...prev };
        delete newState[deviceId];
        return newState;
      });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };
 
  const handleDeleteChild = async (childId, parentId) => {
    try {
      await deleteDevice(childId);
      // Refresh child devices list for this parent
      const children = await getChildDevices(parentId);
      setChildDevices(prev => ({
        ...prev,
        [parentId]: children
      }));
    } catch (error) {
      console.error('Delete child failed:', error);
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
    // Fetch child devices if not loaded yet
    if (!childDevices[parentId]) {
      try {
        const children = await getChildDevices(parentId);
        setChildDevices(prev => ({
          ...prev,
          [parentId]: children
        }));
      } catch (error) {
        console.error('Failed to fetch child devices:', error);
        setChildDevices(prev => ({
          ...prev,
          [parentId]: []
        }));
      }
    }
    // Open the row
    setOpenChildRows(prev => ({
      ...prev,
      [parentId]: true
    }));
  };
 
  const getChildCount = (parentId) => {
    return childDevices[parentId]?.length || 0;
  };
 
  return (
<div>
<Typography variant="h5" gutterBottom>
        Device Details for {siteName}
</Typography>
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
            {parentDevices.map((parent) => (
<React.Fragment key={parent._id}>
<TableRow>
<TableCell>{parent.deviceName}</TableCell>
<TableCell>{parent.serialNumber}</TableCell>
<TableCell>{parent.macId}</TableCell>
<TableCell>
                    {new Date(parent.commissionedDate).toLocaleDateString()}
</TableCell>
<TableCell>
<Button
                      onClick={() => toggleChildDevices(parent._id)}
                      variant="outlined"
                      size="small"
                      endIcon={openChildRows[parent._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
>
                      {getChildCount(parent._id)} CHILD
</Button>
</TableCell>
<TableCell>
<IconButton onClick={() => onEdit(parent)}>
<EditIcon />
</IconButton>
</TableCell>
<TableCell>
<IconButton color="error" onClick={() => handleDelete(parent._id)}>
<DeleteIcon />
</IconButton>
</TableCell>
</TableRow>
                {/* Child Devices Row */}
                {openChildRows[parent._id] && (
<TableRow>
<TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
<Collapse in={openChildRows[parent._id]} timeout="auto" unmountOnExit>
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
                              {childDevices[parent._id]?.length > 0 ? (
                                childDevices[parent._id].map((child) => (
<TableRow key={child._id}>
<TableCell>{child.deviceName}</TableCell>
<TableCell>{child.serialNumber}</TableCell>
<TableCell>{child.macId}</TableCell>
<TableCell>
                                      {new Date(child.commissionedDate).toLocaleDateString()}
</TableCell>
<TableCell>
<IconButton onClick={() => onEdit(child)}>
<EditIcon />
</IconButton>
</TableCell>
<TableCell>
<IconButton 
                                        color="error" 
                                        onClick={() => handleDeleteChild(child._id, parent._id)}
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
</div>
  );
};
 
export default DeviceDetails;