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
} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function EngineerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);
  const [error, setError] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [lines, setLines] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
      <LogoutButton />

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

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Scan Logs
        </Typography>
        {scanLogs && scanLogs.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Operator</TableCell>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>Production Line</TableCell>
                  <TableCell>Scanned At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{log.operator ? log.operator.name : 'N/A'}</TableCell>
                    <TableCell>{log.serialNumber}</TableCell>
                    <TableCell>{log.productionLine ? log.productionLine.model : 'N/A'}</TableCell>
                    <TableCell>{new Date(log.scannedAt).toLocaleString()}</TableCell>
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
