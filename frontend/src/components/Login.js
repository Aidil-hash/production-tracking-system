// src/components/Login.js
import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Add timeout and headers for better error handling
      const res = await axios.post(
        `${API_URL}/api/auth/login`, 
        { name, password },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.urole);
      setError('');
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Connection timeout. Please check your network.');
      } else if (!err.response) {
        setError('Network error. Please check if the server is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{ height: '100vh', backgroundColor: '#f5f5f5' }}
    >
      <Box
        sx={{
          p: 3,
          backgroundColor: '#fff',
          borderRadius: 2,
          boxShadow: 3,
          minWidth: 300,
        }}
      >
        <Typography variant="h5" mb={2} textAlign="center">
          Login
        </Typography>
        {error && (
          <Typography color="error" textAlign="center" mb={2}>
            {error}
          </Typography>
        )}

        <TextField
          label="Name"
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button variant="contained" fullWidth sx={{ mb: 1 }} onClick={handleLogin}>
          Login
        </Button>

        <Button variant="text" fullWidth component={Link} to="/register">
          Register
        </Button>
      </Box>
    </Box>
  );
}

export default Login;
