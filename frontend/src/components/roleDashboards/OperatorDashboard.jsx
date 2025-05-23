import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';
import ExcelFolderWatcher from '../ui/ExcelFolderWatcher';  // Adjust path as needed

function OperatorDashboard() {
  const [assignedLine, setAssignedLine] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);
  const [showSerialStatus, setShowSerialStatus] = useState(false);
  const userName = localStorage.getItem('userName');

  // Set the API_URL from environment variables (for development and production environments)
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLine = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/operators/assignedLine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssignedLine(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch assigned line.');
      }
    };
    fetchLine();
  }, [API_URL, token]);

  const handleStart = async () => {
    if (!assignedLine) return;
    try {
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
    setShowSerialStatus(true);
    setError('');
  };

  const handleSerialStatus = async (serialStatus) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/lines/${assignedLine.lineId}/scan`,
        { serialNumber, serialStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage('Scan successful!');
      setError('');
      setSerialNumber('');
      setShowSerialStatus(false);
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
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleBatchProcessed = (results) => {
    // Ensure results is always an array
    const resultArray = Array.isArray(results) ? results : [results];
    
    try {
      // Calculate success/fail counts
      const successCount = resultArray.reduce((acc, result) => {
        if (result.success && Array.isArray(result.data)) {
          return acc + result.data.filter(r => r.success).length;
        }
        return acc;
      }, 0);

      const failCount = resultArray.reduce((acc, result) => {
        if (result.success && Array.isArray(result.data)) {
          return acc + result.data.filter(r => !r.success).length;
        }
        return acc + (result.success ? 0 : 1);
      }, 0);

      setMessage(`Batch processed: ${successCount} successful, ${failCount} failed.`);

      // Refresh line data
      axios.get(`${API_URL}/api/operators/assignedLine`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => setAssignedLine(res.data))
        .catch(() => setError('Failed to refresh line status'));

    } catch (err) {
      setError('Error processing batch results');
      console.error('Batch processing error:', err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Welcome, {userName}
      </Typography>

      {error && (
        <Typography color="error" align="center" mb={2} sx={{ animation: 'fadeIn 0.5s ease-in' }}>
          {error}
        </Typography>
      )}
      {message && (
        <Typography color="success.main" align="center" mb={2} sx={{ animation: 'fadeIn 0.5s ease-in' }}>
          {message}
        </Typography>
      )}

      <LogoutButton />

      {assignedLine && (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Assigned Line Model: {assignedLine.model}
          </Typography>

          <Box sx={{ mt: 3, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Line Status
            </Typography>
            <Typography>Model: {assignedLine.model}</Typography>
            <Typography>Target Outputs: {assignedLine.targetOutputs}</Typography>
            <Typography>Total Outputs: {assignedLine.totalOutputs}</Typography>
          </Box>

          {assignedLine.startTime ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" color="primary">
                Started at: {new Date(assignedLine.startTime.replace('Z', '+08:00')).toLocaleString('en-MY')}
              </Typography>
              <Typography
                variant="subtitle2"
                color={assignedLine.linestatus === 'RUNNING' ? 'success.main' : 'error.main'}
              >
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
                },
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

          {/* Embed ExcelFolderWatcher here */}
          <Box sx={{ mt: 5 }}>
            <ExcelFolderWatcher
              lineId={assignedLine.lineId}
              authToken={token}
              onBatchProcessed={handleBatchProcessed}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OperatorDashboard;
