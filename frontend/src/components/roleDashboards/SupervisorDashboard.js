// src/components/roleDashboards/SupervisorDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import LogoutButton from '../Logout';

function SupervisorDashboard() {
  const [lines, setLines] = useState([]);
  const [selectedLineData, setSelectedLineData] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch all production lines when component mounts
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch production lines');
      }
    };

    fetchLines();
  }, [API_URL]);

  // Fetch the list of leaders
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched users:', res.data); // Debug: log all fetched users
        // Ensure each user object has a 'role' field. If not, adjust your backend.
        const leaderData = res.data.filter((user) => user.role === 'leader');
        console.log('Filtered leaders:', leaderData); // Debug: log filtered leader data
        setLeaders(leaderData);
      } catch (err) {
        console.error('Error fetching leaders:', err);
        setError(err.response?.data?.message || 'Failed to fetch leaders');
      }
    };

    fetchLeaders();
  }, [API_URL]);

  // Handler to view details: fetches detailed data for the selected production line
  const handleViewDetails = (lineId) => {
    const fetchLineData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines/${lineId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedLineData(res.data);
        setSelectedLine(lineId);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch production line data');
      }
    };
    fetchLineData();
  };

  // Handler to assign leader to a production line
  const handleAssignLeader = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/supervisors/assignLeader`,
        { lineId: selectedLine, leaderId: selectedLeader },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Leader assigned to line successfully!');
      setError('');
      // Optionally refresh the lines list
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to assign leader to line');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Supervisor Dashboard
      </Typography>
      {error && (
        <Typography variant="body1" color="error" align="center" mb={2}>
          {error}
        </Typography>
      )}
      {message && (
        <Typography variant="body1" color="success.main" align="center" mb={2}>
          {message}
        </Typography>
      )}
      <LogoutButton />

      {/* Table of production lines */}
      <TableContainer component={Paper} sx={{ maxWidth: 900, mx: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Model</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.id}</TableCell>
                <TableCell>{line.model}</TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewDetails(line.id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No production lines available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detailed view of selected production line */}
      {selectedLineData && (
        <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto', p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Production Line Details (Selected)
          </Typography>
          <Typography variant="body1">Model: {selectedLineData.model}</Typography>
          <Typography variant="body1">
            Current Material Count: {selectedLineData.currentMaterialCount}
          </Typography>
          <Typography variant="body1">Total Outputs: {selectedLineData.totalOutputs}</Typography>
        </Box>
      )}

      {/* Section to assign leader to a production line */}
      <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Assign Leader to Line
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Line</InputLabel>
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
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Leader</InputLabel>
          <Select
            value={selectedLeader}
            onChange={(e) => setSelectedLeader(e.target.value)}
          >
            <MenuItem value="">
              <em>--Select a leader--</em>
            </MenuItem>
            {leaders.map((leader) => (
              <MenuItem key={leader._id} value={leader._id}>
                {leader.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" fullWidth onClick={handleAssignLeader}>
          Assign Leader
        </Button>
      </Box>
    </Box>
  );
}

export default SupervisorDashboard;