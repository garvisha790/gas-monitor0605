import React, { useState, useEffect } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import axios from "axios";
import {
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
  Grid,
  IconButton,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import Layout from "../components/Layout";

const PlantDashboard = () => {
  const [plants, setPlants] = useState([]);
  const [plantName, setPlantName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/plants");
      setPlants(response.data);
    } catch (err) {
      console.error("Error fetching plants:", err);
    }
  };

  const addPlant = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/plants", {
        plantName,
        location,
        capacity: parseInt(capacity),
        isActive,
      });
      setPlants([...plants, response.data]);
      clearForm();
    } catch (err) {
      console.error("Error adding plant:", err);
    }
  };

  const clearForm = () => {
    setPlantName("");
    setLocation("");
    setCapacity("");
    setIsActive(true);
    setEditMode(false);
    setSelectedPlant(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this plant?")) {
      try {
        await axios.delete(`http://localhost:5000/api/plants/${id}`);
        fetchPlants();
      } catch (err) {
        console.error("Error deleting plant:", err);
      }
    }
  };

  const handleEdit = (plant) => {
    setEditMode(true);
    setSelectedPlant(plant);
    setPlantName(plant.plantName);
    setLocation(plant.location);
    setCapacity(plant.capacity);
    setIsActive(plant.isActive);
  };

  const updatePlant = async () => {
    try {
      await axios.put(`http://localhost:5000/api/plants/${selectedPlant._id}`, {
        plantName,
        location,
        capacity: parseInt(capacity),
        isActive,
      });
      fetchPlants();
      clearForm();
    } catch (err) {
      console.error("Error updating plant:", err);
    }
  };

  return (
    <>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Plant Dashboard
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          {editMode ? "Edit Plant" : "Add New Plant"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Plant Name"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              fullWidth
              value={isActive}
              onChange={(e) =>
                setIsActive(e.target.value === "true" || e.target.value === true)
              }
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            {editMode ? (
              <>
                <Button fullWidth variant="contained" onClick={updatePlant}>
                  Update
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  onClick={clearForm}
                  sx={{ mt: 1 }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={addPlant}
                sx={{ height: "100%" }}
              >
                Add
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#0d47a1" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Plant Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Location</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Capacity</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Edit</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
  {plants.map((plant) => (
    <TableRow key={plant._id}>
      <TableCell>{plant.plantName}</TableCell>
      <TableCell>{plant.location}</TableCell>
      <TableCell>{plant.capacity}</TableCell>
      <TableCell>{plant.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell align="center">
        <Button onClick={() => handleEdit(plant)} color="primary">
          <EditIcon />
        </Button>
      </TableCell>
      <TableCell align="center">
        <Button onClick={() => handleDelete(plant._id)} color="error">
          <DeleteIcon />
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>

          </Table>
        </TableContainer>
      </Paper>
    </>
  );
};

export default PlantDashboard;
