import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function FGDashboard() {
  const [serialNumber, setSerialNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const userName = localStorage.getItem('userName');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleReset = () => {
    setSerialNumber('');
    setResult(null);
    setError('');
  };

  // Auto-reset after 5 seconds
  useEffect(() => {
    if (result) {
      const timer = setTimeout(handleReset, 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  // Main scan handler
  const handleScan = async (e) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setError('Please enter a serial number');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/lines/validate`,
        { serialNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return '#4CAF50';
      case 'NG': return '#F44336';
      case 'PENDING_SECOND': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, margin: '0 auto' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Final Goods Inspection
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Welcome, {userName}
      </Typography>

      <LogoutButton />

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box
          component="form"
          onSubmit={handleScan}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Serial Number"
            variant="outlined"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            fullWidth
            disabled={isLoading}
            sx={{ backgroundColor: '#fff' }}
          />

          {error && (
            <Typography color="error" align="center">
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ py: 1.5 }}
          >
            {isLoading ? 'Validating...' : 'Validate Serial'}
          </Button>
        </Box>

        {result && (
          <Box sx={{ mt: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                backgroundColor: getStatusColor(result.status),
                color: 'white',
                textAlign: 'center'
              }}
            >
              <Typography variant="h5">
                {result.status === 'PASS'
                  ? 'PASS'
                  : result.status === 'NG'
                  ? 'NG'
                  : result.status === 'PENDING_SECOND'
                  ? 'PENDING SECOND'
                  : 'UNKNOWN'}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {result.message}
              </Typography>
            </Paper>

            <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="subtitle2">Serial Details:</Typography>
              <Typography>
                <strong>Line:</strong> {result.lineName || '-'}
              </Typography>
              <Typography>
                <strong>Model:</strong> {result.model || '-'}
              </Typography>
              <Typography>
                <strong>First Status:</strong> {result.firstStatus}
              </Typography>
              <Typography>
                <strong>First Operator:</strong> {result.firstOperator}
              </Typography>
              <Typography>
                <strong>First Scan Time:</strong>{' '}
                {result.firstScanTime
                  ? new Date(result.firstScanTime).toISOString().slice(11, 19)
                  : '-'}
              </Typography>
              <Typography sx={{ mt: 1 }}>
                <strong>Second Status:</strong>{' '}
                {result.verificationStage >= 2
                  ? (result.secondStatus || result.firstStatus)
                  : 'Not yet verified'}
              </Typography>
              <Typography>
                <strong>Second Verifier:</strong>{' '}
                {result.verificationStage >= 2
                  ? (result.secondVerifier || '-')
                  : 'Not yet verified'}
              </Typography>
              <Typography>
                <strong>Second Scan Time:</strong>{' '}
                {result.verificationStage >= 2 && result.secondScanTime
                  ? new Date(result.secondScanTime).toISOString().slice(11, 19)
                  : 'Not yet verified'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                sx={{ color: 'inherit' }}
              >
                Reset
              </Button>
            </Box>

            <Typography variant="caption" align="center" sx={{ mt: 1, display: 'block' }}>
              Auto-resetting in 5 seconds...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default FGDashboard;
