// src/components/roleDashboards/EngineerDashboard.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import axios from 'axios';
import { io } from 'socket.io-client';
import LogoutButton from '../Logout';

function EngineerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);
  const [error, setError] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [lines, setLines] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filteredScanLogs, setFilteredScanLogs] = useState([]);
  const [newLineModel, setNewLineModel] = useState('');
  const [newLineMaterialCount, setNewLineMaterialCount] = useState('');
  const [message, setMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Initialize socket connection (only once)
  useEffect(() => {
    const socket = io(API_URL);
    socket.on('newScan', (data) => {
      // Optionally, check if data.productionLine matches selectedLine
      if (data.productionLine === selectedLine) {
        // Insert the new record into your logs array
      setScanLogs(prevLogs => [{
        operator: data.operator.name,
        serialNumber: data.serialNumber,
        scannedAt: data.scannedAt,
        lineModel: data.productionLine.model //if you want to show it
      }, ...prevLogs]);
      }
    });
    return () => socket.disconnect();
  }, [API_URL, selectedLine]);

  // Fetch available production lines for selection
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
        if (res.data.length > 0) {
          setSelectedLine(res.data[0].id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch lines');
      }
    };
    fetchLines();
  }, [API_URL]);

  // Fetch analytics data based on the selected line
  useEffect(() => {
    if (selectedLine) {
      const fetchAnalytics = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/api/engineer/${selectedLine}/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAnalytics(res.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch analytics data');
        }
      };
      fetchAnalytics();
    }
  }, [API_URL, selectedLine]);

  // Fetch scan logs from the backend for engineers (using query parameter for line)
  useEffect(() => {
    if (selectedLine) {
      const fetchScanLogs = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/api/engineer/allscanlogs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // The response is an array of scan logs
          setScanLogs(res.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch all scan logs');
        }
      };
      fetchScanLogs();
    }
  }, [API_URL, selectedLine]);

  // Filter scan logs based on filterText input
  useEffect(() => {
    if (!filterText) {
      setFilteredScanLogs(scanLogs);
    } else {
      const filtered = scanLogs.filter(log => {
        // Check if the log has a productionLine with a model field
        const lineModel = log.productionLine && log.productionLine.model 
                            ? log.productionLine.model.toLowerCase() 
                            : '';
        return lineModel.includes(filterText.toLowerCase());
      });
      setFilteredScanLogs(filtered);
    }
  }, [filterText, scanLogs]);

  // New function: Add a new production line
  const handleAddNewLine = async (e) => {
    e.preventDefault();
    if (!newLineModel || newLineMaterialCount === '') {
      setError('Please enter both model and material count.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/lines`, 
        { model: newLineModel, materialCount: newLineMaterialCount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optionally, refresh the lines list after adding a new line
      setMessage('New production line added successfully!');
      setError('');
      setNewLineModel('');
      setNewLineMaterialCount('');
      // Refresh lines
      const linesRes = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(linesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add new line');
      setMessage('');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Engineer Dashboard
      </Typography>
      {error && (
        <Typography variant="body1" color="error" align="center" mb={2}>
          {error}
        </Typography>
      )}
      {/** Message block **/}
      <Typography variant="body1" color="success.main" align="center" mb={2}>
        {""}
      </Typography>
      <LogoutButton />

      {/* Dropdown to select production line */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Select Production Line</InputLabel>
        <Select
          value={selectedLine}
          onChange={(e) => setSelectedLine(e.target.value)}
        >
          <MenuItem value="">
            <em>--Select a line--</em>
          </MenuItem>
          {lines.map((line) => (
            <MenuItem key={line.id} value={line.id}>
              {line.model}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {analytics && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ minWidth: 275 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Efficiency Metrics
                </Typography>
                <Typography variant="body1">
                  Overall Efficiency: {analytics.overallEfficiency}%
                </Typography>
                <Typography variant="body1">
                  Avg Outputs per Minute: {analytics.efficiencyPerMinute}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ minWidth: 275 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Material Forecast
                </Typography>
                <Typography variant="body1">
                  Predicted Time to Depletion: {analytics.predictedTimeToDepletion} minutes
                </Typography>
                <Typography variant="body1">
                  Current Material Level: {analytics.currentMaterialCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* New Line Form Section */}
      <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto', p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Add New Production Line
        </Typography>
        <Box component="form" onSubmit={handleAddNewLine}>
          <TextField
            label="Model"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={newLineModel}
            onChange={(e) => setNewLineModel(e.target.value)}
          />
          <TextField
            label="Initial Material Count"
            variant="outlined"
            fullWidth
            type="number"
            sx={{ mb: 2 }}
            value={newLineMaterialCount}
            onChange={(e) => setNewLineMaterialCount(e.target.value)}
          />
          <Button variant="contained" fullWidth type="submit">
            Add New Line
          </Button>
          {message && (
            <Typography variant="body1" color="success.main" align="center" mb={2}>
              {message}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Scan Logs Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Scan Logs
        </Typography>
        <TextField
          label="Filter by Model"
          variant="outlined"
          fullWidth
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          sx={{ mb: 2 }}
        />
        {filteredScanLogs && filteredScanLogs.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Scanned At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredScanLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.model || log.productionLine.model || 'Unknown'}</TableCell>
                    <TableCell>{log.operator && log.operator.name ? log.operator.name : 'Unknown'}</TableCell>
                    <TableCell>{log.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{log.scannedAt ? new Date(log.scannedAt).toLocaleString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body1" align="center">
            No scan logs available.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default EngineerDashboard;
