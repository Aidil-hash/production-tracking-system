import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function OperatorDashboard() {
  const [lineId, setLineId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);
  const [loadingScan, setLoadingScan] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch assigned line when component mounts
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

  // Handle serial scanning
  const handleScan = async (e) => {
    e.preventDefault();
    if (!serialNumber) {
      setError('Please enter a serial number');
      return;
    }

    setLoadingScan(true);
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
      setLineStatus(res.data.line); // response includes updated line info
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Scan failed');
    } finally {
      setLoadingScan(false);
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
          <Typography variant="h6" gutterBottom>
            Assigned Line ID: {lineId}
          </Typography>

          {lineStatus && lineStatus.model && (
            <Box sx={{ mt: 3, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Line Status
              </Typography>
              <Typography>Model: {lineStatus.model}</Typography>
              <Typography>Current Material Count: {lineStatus.currentMaterialCount}</Typography>
              <Typography>Total Outputs: {lineStatus.totalOutputs}</Typography>
            </Box>
          )}

          <Box
            component="form"
            onSubmit={handleScan}
            sx={{
              mt: 3,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <TextField
              label="Serial Number"
              variant="outlined"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              fullWidth
              sx={{ backgroundColor: '#fff', borderRadius: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loadingScan}
              sx={{ minWidth: 100 }}
            >
              {loadingScan ? <CircularProgress size={24} color="inherit" /> : 'Scan'}
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
