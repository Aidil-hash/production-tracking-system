// src/components/roleDashboards/LeaderDashboard.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import axios from 'axios';

function LeaderDashboard() {
  const [lineData, setLineData] = useState(null);
  const [model, setModel] = useState('');
  const [materialCount, setMaterialCount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');

  // Use API URL from environment variables or fallback
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
        const res = await axios.get(`${API_URL}/api/lines/${lineId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLineData(res.data);
        setModel(res.data.model);
        setMaterialCount(res.data.currentMaterialCount);
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
        const res = await axios.get(`${API_URL}/api/operators`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOperators(res.data);
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
      await axios.post(`${API_URL}/api/lines/assignLine`, 
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
      <Typography variant="h4" align="center" gutterBottom>
        Leader Dashboard
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
      {lineData ? (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Production Line Details
          </Typography>
          <Typography variant="body1" mb={1}>
            Line ID: {lineId}
          </Typography>
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
                  <MenuItem key={operator.id} value={operator.id}>{operator.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" fullWidth onClick={handleAssign}>
              Assign Line
            </Button>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Additional Details</Typography>
            <Typography variant="body1">
              Total Outputs: {lineData.totalOutputs}
            </Typography>
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