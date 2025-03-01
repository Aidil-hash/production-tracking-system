// src/components/Register.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';

function Register() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Use the API URL from the environment variable
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/users`, { name, role, password });
      setSuccess('User registered successfully!');
      setError('');
      setTimeout(() => {
        navigate('/'); // Redirect to login
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setSuccess('');
    }
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4" component="h2" gutterBottom>
        Register
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <form onSubmit={handleRegister}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <FormControl fullWidth required margin="normal">
          <InputLabel>Role</InputLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <MenuItem value=""><em>--Select a role--</em></MenuItem>
            <MenuItem value="operator">Operator</MenuItem>
            <MenuItem value="leader">Leader</MenuItem>
            <MenuItem value="supervisor">Supervisor</MenuItem>
            <MenuItem value="engineer">Engineer</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Register
        </Button>
      </form>
    </Container>
  );
}

export default Register;