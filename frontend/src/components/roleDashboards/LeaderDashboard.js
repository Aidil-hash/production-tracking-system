// src/components/roleDashboards/LeaderDashboard.js
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
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
  Paper 
} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

function LeaderDashboard() {
  const [lineData, setLineData] = useState(null);
  const [model, setModel] = useState('');
  const [materialCount, setMaterialCount] = useState('');
  const [predictedTimeToDepletion, setPredictedTimeToDepletion] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');

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
        setModel(res.data.model);
        setMaterialCount(res.data.currentMaterialCount);
        setPredictedTimeToDepletion(res.data.predictedTimeToDepletion || 'N/A');
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

  // Handle update of production line details
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/lines/${lineId}`, 
        { model, materialCount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Production line updated successfully!');
      setError('');
      if (res.data.line) {
        setLineData(res.data.line);
        setPredictedTimeToDepletion(res.data.line.predictedTimeToDepletion || 'N/A');
      }
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to update production line');
    }
  };

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
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to assign line to operator');
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
                  <TableCell>{predictedTimeToDepletion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Box component="form" onSubmit={handleUpdate} sx={{ mt: 3 }}>
            <TextField
              label="Model"
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <TextField
              label="Current Material Count"
              variant="outlined"
              fullWidth
              type="number"
              sx={{ mb: 2 }}
              value={materialCount}
              onChange={(e) => setMaterialCount(e.target.value)}
            />
            <Button variant="contained" fullWidth type="submit">
              Update Production Line
            </Button>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Assign Line to Operator</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Operator</InputLabel>
              <Select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
              >
                <MenuItem value=""><em>--Select an operator--</em></MenuItem>
                {operators.map((operator) => (
                  <MenuItem key={operator._id} value={operator._id}>
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
      ) : (
        <Typography variant="body1" align="center">
          Loading production line details...
        </Typography>
      )}
    </Box>
  );
}

export default LeaderDashboard;
