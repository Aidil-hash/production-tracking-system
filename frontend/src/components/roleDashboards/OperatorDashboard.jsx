import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';
import ExcelFolderWatcher from '../ui/ExcelFolderWatcher';

function OperatorDashboard() {
  const [assignedLine, setAssignedLine] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineStatus, setLineStatus] = useState(null);
  const [modelsRun, setModelsRun] = useState([]);
  const [todayTarget, setTodayTarget] = useState(null);
  const userName = localStorage.getItem('userName');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLine = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/operators/assignedLine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssignedLine(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch assigned line.');
      }
    };
    fetchLine();
  }, [API_URL, token]);

  // Fetch models run on this line
  useEffect(() => {
    if (!assignedLine) return;
    axios.get(`${API_URL}/api/lines/${assignedLine.lineId}/models-run`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setModelsRun(res.data));
  }, [assignedLine, API_URL, token]);

  // Fetch today's target
  useEffect(() => {
    if (!assignedLine) return;
    const today = new Date().toISOString().slice(0, 10);
    axios.get(`${API_URL}/api/leader/get-hourly-targets`, {
      params: { lineId: assignedLine.lineId, date: today },
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.data && Array.isArray(res.data.slots)) {
        const total = res.data.slots.reduce((sum, slot) => sum + Number(slot.target || 0), 0);
        setTodayTarget(total);
      }
    })
    .catch(() => setTodayTarget(null));
  }, [assignedLine, API_URL, token]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleStart = async () => {
    if (!assignedLine) return;
    try {
      const response = await axios.patch(
        `${API_URL}/api/lines/${assignedLine.lineId}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLineStatus(response.data.line);
      setMessage('Line started successfully');
      const res = await axios.get(`${API_URL}/api/operators/assignedLine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedLine(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start line');
    }
  };

  const handleBatchProcessed = (results) => {
    // Ensure results is always an array
    const resultArray = Array.isArray(results) ? results : [results];
    try {
      const successCount = resultArray.reduce((acc, result) => {
        if (result.success && Array.isArray(result.data)) {
          return acc + result.data.filter(r => r.success).length;
        }
        return acc;
      }, 0);

      const failCount = resultArray.reduce((acc, result) => {
        if (result.success && Array.isArray(result.data)) {
          return acc + result.data.filter(r => !r.success).length;
        }
        return acc + (result.success ? 0 : 1);
      }, 0);

      setMessage(`Batch processed: ${successCount} successful, ${failCount} failed.`);

      // Refresh line data
      axios.get(`${API_URL}/api/operators/assignedLine`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => setAssignedLine(res.data))
        .catch(() => setError('Failed to refresh line status'));

    } catch (err) {
      setError('Error processing batch results');
      console.error('Batch processing error:', err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" align="center" mb={2} sx={{ animation: 'fadeIn 0.5s ease-in' }}>
          {error}
        </Typography>
      )}
      {message && (
        <Typography color="success.main" align="center" mb={2} sx={{ animation: 'fadeIn 0.5s ease-in' }}>
          {message}
        </Typography>
      )}

      <LogoutButton />

      {modelsRun.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Models run on this line:</Typography>
          <ul>
            {[...new Map(modelsRun.map(run => [run.code, run])).values()].map(run => (
              <li key={run.code}>
                {run.modelName} (since {new Date(run.firstSeen).toISOString().slice(11, 19)})
              </li>
            ))}
          </ul>
        </Box>
      )}

      {assignedLine && (
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Assigned Line Operator: {userName}
          </Typography>

          <Box sx={{ mt: 3, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Line Status
            </Typography>
            <Typography>Assigned Line: {assignedLine.name}</Typography>
            <Typography>
              Today's Target Output: {todayTarget !== null ? todayTarget : '-'}
            </Typography>
            <Typography>Total Outputs: {assignedLine.totalOutputs}</Typography>
          </Box>

          {assignedLine.startTime ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" color="primary">
                Started at: {new Date(assignedLine.startTime.replace('Z', '+08:00')).toLocaleString('en-MY')}
              </Typography>
              <Typography
                variant="subtitle2"
                color={assignedLine.linestatus === 'RUNNING' ? 'success.main' : 'error.main'}
              >
                Status: {assignedLine.linestatus}
              </Typography>
            </Box>
          ) : (
            <Button
              variant="contained"
              onClick={handleStart}
              disabled={!assignedLine}
              sx={{
                mt: 2,
                minWidth: 100,
                backgroundColor: '#25994b',
                '&:hover': {
                  backgroundColor: '#208541',
                },
                '&:disabled': {
                  backgroundColor: '#cccccc',
                },
              }}
            >
              Start Line
            </Button>
          )}

          {/* Embed ExcelFolderWatcher here */}
          <Box sx={{ mt: 5 }}>
            <ExcelFolderWatcher
              lineId={assignedLine.lineId}
              authToken={token}
              onBatchProcessed={handleBatchProcessed}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default OperatorDashboard;
