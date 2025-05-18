import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function FGDashboard() {
  const [serialNumber, setSerialNumber] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const userName = localStorage.getItem('userName');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleReset = () => {
    setSerialNumber('');
    setValidationResult(null);
    setError('');
  };

  // Auto-reset after 5 seconds
  useEffect(() => {
    if (validationResult) {
      const timer = setTimeout(() => {
        handleReset();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [validationResult]);

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

      // Map backend response to our display states
      if (response.data.passedFirstStation) {
        setValidationResult({
          status: 'PASS',
          message: response.data.message,
          scanRecord: response.data.scanRecord
        });
      } else if (response.data.Status === 'NG' || response.data.serialStatus === 'NG') {
        setValidationResult({
          status: 'NG',
          message: response.data.message || 'Serial rejected at first station',
          scanRecord: response.data.scanRecord
        });
      } else {
        // Not processed case
        setValidationResult({
          status: 'NOT_PROCESSED',
          message: response.data.message || 'Serial not processed at first station'
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
      setValidationResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch(validationResult?.status) {
      case 'PASS': return '#4CAF50'; // Green
      case 'NG': return '#F44336';   // Red
      case 'NOT_PROCESSED': return '#FF9800'; // Orange
      default: return '#9E9E9E';     // Grey
    }
  };

  const getStatusText = () => {
    switch(validationResult?.status) {
      case 'PASS': return 'PASS';
      case 'NG': return 'NG';
      case 'NOT_PROCESSED': return 'NOT PROCESSED';
      default: return '';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, margin: '0 auto' }}>
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

        {validationResult && (
          <Box sx={{ mt: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                backgroundColor: getStatusColor(),
                color: 'white',
                textAlign: 'center'
              }}
            >
              <Typography variant="h5">
                {getStatusText()}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {validationResult.message}
              </Typography>
            </Paper>

            {validationResult.scanRecord && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="subtitle2">First Station Details:</Typography>
                <Typography>Model: {validationResult.scanRecord.model}</Typography>
                <Typography>Operator: {validationResult.scanRecord.operator}</Typography>
                <Typography>
                  Time: {new Date(validationResult.scanRecord.scanTime).toLocaleString()}
                </Typography>
                {validationResult.status === 'NG' && (
                  <Typography color="error">REJECTED</Typography>
                )}
              </Box>
            )}

            {validationResult.status === 'NOT_PROCESSED' && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#FFF3E0', borderRadius: 1 }}>
                <Typography>This serial needs to be processed at first station</Typography>
              </Box>
            )}

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