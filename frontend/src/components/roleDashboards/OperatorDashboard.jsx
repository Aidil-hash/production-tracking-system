import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';
import BarcodeScanner from '../ui/BarcodeScanner';

function OperatorDashboard() {
  const [assignedLine, setAssignedLine] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanning, setScanning] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchLine = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/operators/assignedLine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssignedLine(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch assigned line.');
      }
    };
    fetchLine();
  }, [API_URL]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!serialNumber) {
      setError('Please enter a serial number');
      return;
    }

    setLoadingScan(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/lines/${assignedLine.lineId}/scan`,
        { serialNumber },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage('Scan successful!');
      setError('');
      setSerialNumber('');
      setLineStatus(response.data.line);
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
        <Typography color="error" align="center" mb={2}>
          {error}
        </Typography>
      )}
      {message && (
        <Typography color="success.main" align="center" mb={2}>
          {message}
        </Typography>
      )}

      <LogoutButton />

      {assignedLine && (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Assigned Line Model: {assignedLine.model}
          </Typography>

          {lineStatus && (
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
            sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}
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
          <Box>
            <Button
              variant="outlined"
              onClick={() => setScanning((prev) => !prev)}
              sx={{ mt: 2 }}
            >
              {scanning ? 'Stop Camera Scan' : 'Scan via Camera'}
            </Button>
            
            {scanning && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', width: '1000px' }}>
                <Box sx={{ width: '80%', maxWidth: '600px', height: '400px' }}>
                  <BarcodeScanner
                    onScanSuccess={(code) => {
                      setSerialNumber(code);
                      setScanning(false);
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OperatorDashboard;
