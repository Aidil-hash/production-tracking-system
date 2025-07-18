import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';
import { subHours } from "date-fns";
import { toast } from 'sonner';

function SerialDrivenDashboard() {
  const [lineInfo, setLineInfo] = useState(null);
  const [pendingSerials, setPendingSerials] = useState([]);
  const [manualSerial, setManualSerial] = useState('');
  const [awaitingSecondStatus, setAwaitingSecondStatus] = useState(false);
  const [serialRejected, setSerialRejected] = useState(false);
  const userName = localStorage.getItem('userName');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  const fetchLineFromSerial = useCallback(async (serial) => {
    try {
      const res = await axios.get(`${API_URL}/api/lines/serial/${serial}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLineInfo(res.data);
      return res.data;
    } catch (err) {
      toast.error('Could not find line for this serial.');
      return null;
    }
  }, [API_URL, token]);

  const fetchPendingSerials = useCallback(async (lineId) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/lines/${lineId}/pending-verification`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingSerials(res.data);
    } catch (err) {
      toast.error('Failed to fetch pending serials.');
    }
  }, [API_URL, token]);

  const handleManualSecondVerify = useCallback(async () => {
    if (!manualSerial) return;
    setLineInfo(null);
    setPendingSerials([]);
    setSerialRejected(false);

    try {
      const res = await axios.post(`${API_URL}/api/lines/validate`, {
        serialNumber: manualSerial
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.firstStatus === 'NG') {
        setSerialRejected(true);
      }
      setAwaitingSecondStatus(true);
    } catch (err) {
      toast.error('Failed to validate serial');
    }
  }, [API_URL, manualSerial, token]);

  const handleFinalSecondVerify = useCallback(
    async (status) => {
      const line = await fetchLineFromSerial(manualSerial);
      if (!line) return;

      try {
        const response = await axios.post(
          `${API_URL}/api/lines/${line.lineId}/scan`,
          { serialNumber: manualSerial, serialStatus: status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(response.data.message || 'Second verification successful');
        setManualSerial('');
        setAwaitingSecondStatus(false);
        fetchPendingSerials(line.lineId);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Second verification failed');
      }
    },
    [API_URL, fetchLineFromSerial, fetchPendingSerials, manualSerial, token]
  );

  useEffect(() => {
    if (!awaitingSecondStatus || serialRejected) return;
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === '1') {
        handleFinalSecondVerify("PASS");
      } else if (event.key === '3' || event.key === 'Escape') {
        handleFinalSecondVerify("NG");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [awaitingSecondStatus, serialRejected, manualSerial, handleFinalSecondVerify]);

  return (
    <Box sx={{ p: 4 }}>

      <Typography variant="h6" gutterBottom align="center">
        Assigned Line Operator: {userName}
      </Typography>

      <LogoutButton />

      {/* Serial input with conditional action buttons */}
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!awaitingSecondStatus && manualSerial) {
              handleManualSecondVerify();
            }
            // When awaitingSecondStatus, keyboard shortcuts below will handle!
          }}
          style={{ display: 'flex', gap: 16, alignItems: 'center' }}
        >
          <TextField
            label="Serial for Second Verification"
            value={manualSerial}
            onChange={e => {
              setManualSerial(e.target.value);
              setAwaitingSecondStatus(false);
            }}
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
          {!awaitingSecondStatus ? (
            <Button
              type="submit"
              variant="contained"
              disabled={!manualSerial}
              sx={{ backgroundColor: '#1976d2', color: '#fff' }}
            >
              Second Verify
            </Button>
          ) : serialRejected ? (
            <Button
              disabled
              sx={{
                backgroundColor: '#fdd835',
                color: '#000',
                fontWeight: 'bold',
                paddingX: 2,
                paddingY: 1
              }}
            >
              This serial is NG at the first station
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={() => handleFinalSecondVerify("PASS")}
                sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: 'darkgreen' } }}
              >
                PASS
              </Button>
              <Button
                variant="contained"
                onClick={() => handleFinalSecondVerify("NG")}
                sx={{ backgroundColor: 'red', color: 'white', '&:hover': { backgroundColor: '#b71c1c' } }}
              >
                NG
              </Button>
            </>
          )}
        </form>
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
                        {s.scannedAt
                        ? subHours(new Date(s.scannedAt), 8).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',    // or 'numeric' for 4-digit year
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })
                        : 'N/A'}
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