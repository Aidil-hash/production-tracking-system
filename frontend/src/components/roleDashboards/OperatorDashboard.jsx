// src/components/OperatorDashboard.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function OperatorDashboard() {
  const [lineId, setLineId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);

  // Use API URL from environment variables or fallback
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch assigned line for the operator when component mounts
  useEffect(() => {
    const fetchOperatorLine = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/operators/assignedLine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLineId(res.data.lineId);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch assigned line');
      }
    };
    fetchOperatorLine();
  }, [API_URL]);

  // Fetch line status when the lineId changes
  useEffect(() => {
    const fetchLineStatus = async () => {
      if (!lineId) return;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines/${lineId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLineStatus(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch line status');
      }
    };
    fetchLineStatus();
  }, [API_URL, lineId]);

  // Handle serial scanning
  const handleScan = async (e) => {
    e.preventDefault();
    if (!serialNumber) {
      setError('Please enter a serial number');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/lines/${lineId}/scan`,
        { serialNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Scan successful!');
      setError('');
      setSerialNumber('');
      // Optionally, update lineStatus with the latest data from the response
      setLineStatus(res.data.line);
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Scan failed');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Operator Dashboard
      </Typography>
      {error && (
        <Typography variant="body1" color="error" align="center" mb={2}>
          {error}
        </Typography>
      )}
      {message && (
        <Typography variant="body1" color="success.main" align="center" mb={2}>
          {message}
        </Typography>
      )}
      <LogoutButton />

      {lineId ? (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6">
            Assigned Line ID: {lineId}
          </Typography>
          {lineStatus ? (
            <Box
              sx={{
                mt: 3,
                p: 2,
                border: '1px solid #ccc',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Line Status
              </Typography>
              <Typography variant="body1">
                Model: {lineStatus.model}
              </Typography>
              <Typography variant="body1">
                Current Material Count: {lineStatus.currentMaterialCount}
              </Typography>
              <Typography variant="body1">
                Total Outputs: {lineStatus.totalOutputs}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading line status...
            </Typography>
          )}

          <Box
            component="form"
            onSubmit={handleScan}
            sx={{
              mt: 3,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <TextField
              label="Serial Number"
              variant="outlined"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              fullWidth
              sx={{ 
                border : 'solid #ccc',
                borderRadius: 2,
               }}
            />
            <Button type="submit" variant="contained" sx={{ ml: 2 }}>
              Scan
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body1" align="center">
          Loading assigned line...
        </Typography>
      )}
    </Box>
  );
}

export default OperatorDashboard;
