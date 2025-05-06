import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      const token = res.data.token;
      const userData = { email };
      login(token, userData);
      navigate("/dashboard");
    } catch (err) {
      setErrorMsg("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <Box
  display="flex"
  height="100vh"
  width="100vw"
  justifyContent="center"
  alignItems="center"
  sx={{
    background: "linear-gradient(to right, #e6f7ff, #f0f9ff)",
    overflow: "hidden", // <-- add this too
  }}
>
      <Card
        sx={{
          width: 400,
          padding: 4,
          borderRadius: 4,
          boxShadow: 6,
          backgroundColor: "#ffffff",
        }}
      >
        <CardContent>
          {/* Logo or title */}
          <Typography
            variant="h5"
            textAlign="center"
            gutterBottom
            sx={{ color: "#007acc", fontWeight: "bold" }}
          >
            Oxygen Plant Monitor Login
          </Typography>

          {/* Login form */}
          <form onSubmit={handleLogin}>
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {errorMsg && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {errorMsg}
              </Typography>
            )}

            <Box mt={2} mb={1}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ backgroundColor: "#007acc", "&:hover": { backgroundColor: "#005f99" } }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
              </Button>
            </Box>
          </form>

          <Typography variant="body2" textAlign="center" mt={2}>
            Don’t have an account? <Link to="/register">Register here</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
