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
  const [showSerialStatus, setShowSerialStatus] = useState(false);
  const userName = localStorage.getItem('userName');

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
      const res = await axios.get(`${API_URL}/api/operators/assignedLine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedLine(res.data);
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
    setShowSerialStatus(true); // Show the PASS/NG buttons
    setError('');
  };

  const handleSerialStatus = async (serialStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/lines/${assignedLine.lineId}/scan`,
        { serialNumber, serialStatus }, // Include serialStatus in the request
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage('Scan successful!');
      setError('');
      setSerialNumber('');
      setShowSerialStatus(false); // Hide the buttons after successful scan
      setLineStatus(response.data.line);
      const res2 = await axios.get(`${API_URL}/api/operators/assignedLine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedLine(res2.data);
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Scan failed');
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000); // Disappear after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000); // Disappear after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Welcome, {userName}
      </Typography>

      {error && (
        <Typography 
          color="error" 
          align="center" 
          mb={2}
          sx={{
            animation: 'fadeIn 0.5s ease-in',
            '@keyframes fadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
          {error}
        </Typography>
      )}
      {message && (
        <Typography 
          color="success.main" 
          align="center" 
          mb={2}
          sx={{
            animation: 'fadeIn 0.5s ease-in',
            '@keyframes fadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
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
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" color="primary">
                  Started at: {new Date(assignedLine.startTime.replace('Z', '+08:00')).toLocaleString('en-MY')}
                </Typography>
                <Typography variant="subtitle2" color={assignedLine.linestatus === 'RUNNING' ? 'success.main' : 'error.main'}>
                  Status: {assignedLine.linestatus}
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={handleStart}
                disabled={!assignedLine}
                sx={{
                  mt: 2,
                  minWidth: 100,
                  backgroundColor: '#25994b',
                  '&:hover': {
                    backgroundColor: '#208541',
                  },
                  '&:disabled': {
                    backgroundColor: '#cccccc',
                  }
                }}
              >
                Start Line
              </Button>
            )}

          <Box
            component="form"
            onSubmit={handleScan}
            sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                sx={{
                  minWidth: 100,
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#115293',
                  },
                }}
              >
                Enter
              </Button>
            </Box>
            
            {showSerialStatus && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => handleSerialStatus('PASS')}
                  sx={{
                    minWidth: 100,
                    backgroundColor: '#25994b',
                    '&:hover': {
                      backgroundColor: '#208541',
                    },
                  }}
                >
                  PASS
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSerialStatus('NG')}
                  sx={{
                    minWidth: 100,
                    backgroundColor: '#dc3545',
                    '&:hover': {
                      backgroundColor: '#c82333',
                    },
                  }}
                >
                  NG
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OperatorDashboard;
