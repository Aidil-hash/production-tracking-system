import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function OperatorDashboard() {
  const [assignedLine, setAssignedLine] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);

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

  const handleStart = async () => {
    if (!assignedLine) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/lines/${assignedLine.lineId}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLineStatus(response.data.line);
      setMessage('Line started successfully');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start line');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!serialNumber) {
      setError('Please enter a serial number');
      return;
    }
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

          {assignedLine && (
            <Box sx={{ mt: 3, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Line Status
              </Typography>
              <Typography>Model: {assignedLine.model}</Typography>
              <Typography>Target Outputs: {assignedLine.targetOutputs}</Typography>
              <Typography>Total Outputs: {assignedLine.totalOutputs}</Typography>
            </Box>
          )}

              {assignedLine.startTime ? (
                <Typography sx={{ mt: 1 }}>
                  Started at: {new Date(assignedLine.startTime).toLocaleString()}
                </Typography>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleStart}
                  sx={{ mt: 2, minWidth: 100 }}
                >
                  Start
                </Button>
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
              sx={{ minWidth: 100,
                backgroundColor: '#1976d2', // Custom color
                '&:hover': {
                  backgroundColor: '#115293', // Darker shade on hover
                },
               }}
            >
              Scan
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OperatorDashboard;
