// src/components/roleDashboards/LeaderDashboard.js
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button 
} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function LeaderDashboard() {
  const [lineData, setLineData] = useState(null);
  const [predictedTimeToDepletion, setPredictedTimeToDepletion] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [lines, setLines] = useState([]); // List of all production lines

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch the leader's assigned production line from the API
  useEffect(() => {
    const fetchAssignedLine = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/leaders/assignedLine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLineId(res.data.lineId);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch assigned line');
      }
    };

    fetchAssignedLine();
  }, [API_URL]);

  // Fetch production line details when lineId is available
  useEffect(() => {
    if (!lineId) return;
    const fetchLineData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Call the predict endpoint to get additional info including predicted time
        const res = await axios.get(`${API_URL}/api/lines/${lineId}/predict`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Predict API response:', res.data); // Debug: check response structure
        setLineData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch production line data');
      }
    };

    fetchLineData();
  }, [API_URL, lineId]);

  // Fetch the list of operators
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const operatorData = res.data.filter((user) => user.role === 'operator');
        setOperators(operatorData);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch operators');
      }
    };

    fetchOperators();
  }, [API_URL]);

  // Fetch list of all production lines for the table
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
      } catch (err) {
        console.error('Failed to fetch production lines:', err);
      }
    };

    fetchLines();
  }, [API_URL]);

  // Handle assigning line to operator
  const handleAssign = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/leaders/assignLine`, 
        { lineId, operatorId: selectedOperator },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Line assigned to operator successfully!');
      setError('');
      // Refresh lines list after assignment
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to assign line to operator');
    }
  };

  // Handler to detach operator from a production line
  const handleDetachOperator = async (lineId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leaders/detachOperator`,
        { lineId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Operator detached from line successfully!');
      setError('');
      // Refresh lines after detachment
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to detach operator from line');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" align="center" gutterBottom>
          Leader Dashboard
        </Typography>
        <LogoutButton />
      </Box>
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
      {lineData ? (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Production Line Details
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell>Current Material Count</TableCell>
                  <TableCell>Total Outputs</TableCell>
                  <TableCell>Predicted Time to Depletion (minutes)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{lineData.model}</TableCell>
                  <TableCell>{lineData.currentMaterialCount}</TableCell>
                  <TableCell>{lineData.totalOutputs}</TableCell>
                  <TableCell>{lineData.predictedTimeToDepletion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Assign operator section */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" color= "white" >Assign Line to Operator</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Operator</InputLabel>
              <Select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                sx={{color:'white'}}
              >
                <MenuItem value="">
                  <em>--Select an operator--</em>
                </MenuItem>
                {operators.map((operator) => (
                  <MenuItem key={operator._id} value={operator._id} sx={{color:'white'}}>
                    {operator.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" fullWidth onClick={handleAssign}>
              Assign Line
            </Button>
          </Box>
        </Box>
      ) : null}
      {/* Production lines table with detach functionality */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Production Lines
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Operator</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.id}</TableCell>
                  <TableCell>{line.model}</TableCell>
                  <TableCell>{line.operatorName || 'No operator assigned'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {line.operatorId && (
                        <Button
                          variant="contained"
                          size="small"
                          color="error"
                          onClick={() => handleDetachOperator(line.id)}
                        >
                          Detach Operator
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No production lines available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

export default LeaderDashboard;
