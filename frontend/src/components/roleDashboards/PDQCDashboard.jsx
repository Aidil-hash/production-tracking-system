import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, MenuItem
} from '@mui/material';
import Select from '@mui/material/Select';
import axios from 'axios';
import LogoutButton from '../Logout';

function SerialDrivenDashboard() {
  const [lineInfo, setLineInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingSerials, setPendingSerials] = useState([]);
  const [manualSerial, setManualSerial] = useState('');
  const [secondStatus, setSecondStatus] = useState('PASS');
  const userName = localStorage.getItem('userName');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  const fetchLineFromSerial = async (serial) => {
    try {
      const res = await axios.get(`${API_URL}/api/lines/serial/${serial}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLineInfo(res.data);
      return res.data;
    } catch (err) {
      setError('Could not find line for this serial.');
      return null;
    }
  };

  const fetchPendingSerials = async (lineId) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/lines/${lineId}/pending-verification`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingSerials(res.data);
    } catch (err) {
      setError('Failed to fetch pending serials.');
    }
  };

  const handleManualSecondVerify = async () => {
    if (!manualSerial) return;
    setMessage('');
    setError('');
    setLineInfo(null);
    setPendingSerials([]);

    const line = await fetchLineFromSerial(manualSerial);
    if (!line) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/lines/${line.lineId}/scan`,
        { serialNumber: manualSerial, serialStatus: secondStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message || 'Second verification successful');
      setManualSerial('');
      fetchPendingSerials(line.lineId);
    } catch (err) {
      setError(err.response?.data?.message || 'Second verification failed');
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Box sx={{ p: 4 }}>
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

      <Typography variant="h6" gutterBottom align="center">
        Assigned Line Operator: {userName}
      </Typography>

      <LogoutButton />

      {/* Serial input with status selector */}
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Serial for Second Verification"
            value={manualSerial}
            onChange={e => setManualSerial(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{
              '& label': { color: '#ffffff' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#ffffff' },
                '&:hover fieldset': { borderColor: '#1565c0' },
                '&.Mui-focused fieldset': { borderColor: '#0d47a1' }
              },
              '& input': { color: '#ffffff' }
            }}
          />
          <Select
            value={secondStatus}
            onChange={e => setSecondStatus(e.target.value)}
            sx={{
              minWidth: 120,
              color: "#fff",
              backgroundColor: "#1e293b",
              '& .MuiOutlinedInput-notchedOutline': { borderColor: "#ffffff" },
              '& .MuiSvgIcon-root': { color: "#fff" }
            }}
          >
            <MenuItem value="PASS">PASS</MenuItem>
            <MenuItem value="NG">NG</MenuItem>
          </Select>
          <Button
            variant="contained"
            onClick={handleManualSecondVerify}
            disabled={!manualSerial}
            sx={{
              backgroundColor: '#1976d2',
              color: '#fff',
              '&:hover': { backgroundColor: '#1565c0' },
              '&:disabled': { backgroundColor: '#90caf9', color: '#fff' }
            }}
          >
            Second Verify ({secondStatus})
          </Button>
        </Box>
      </Box>

      {/* Line Info */}
      {lineInfo && (
        <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Line Status
          </Typography>
          <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography>Line: {lineInfo.name}</Typography>
            <Typography>Target Outputs: {lineInfo.targetOutputs}</Typography>
            <Typography>Total Outputs: {lineInfo.totalOutputs}</Typography>
          </Box>

          {/* Pending serials */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Pending Second Verification ({pendingSerials.length})
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>First Operator</TableCell>
                    <TableCell>First Scan Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingSerials.length > 0 ? pendingSerials.map((s) => (
                    <TableRow key={s.serialNumber}>
                      <TableCell>{s.serialNumber}</TableCell>
                      <TableCell>{s.model}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        {s.scannedAt ? new Date(s.scannedAt).toLocaleString('en-MY') : '-'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No pending serials.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default SerialDrivenDashboard;
