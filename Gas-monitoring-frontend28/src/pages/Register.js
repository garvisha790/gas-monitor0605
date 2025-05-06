import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import axios from "axios";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
      });
      alert("Registration successful! You can now log in.");
      navigate("/");
    } catch (err) {
      alert("Registration failed. Try again.");
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #e0f7fa, #ffffff)",
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ padding: 4, borderRadius: 3 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Oxygen Plant Monitor 
            Registration
          </Typography>
          <Box component="form" onSubmit={handleRegister} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              margin="normal"
              autoComplete="name"
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, backgroundColor: "#1976d2" }}
            >
              Register
            </Button>
            <Typography variant="body2" align="center">
              Already have an account? <Link to="/">Login here</Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;