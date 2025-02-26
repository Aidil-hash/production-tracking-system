// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [lineData, setLineData] = useState(null);
  const [error, setError] = useState('');
  
  // Use the API URL from environment variables
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Example: Fetch production line data (assuming line id 1 exists)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines/1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLineData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch data');
      }
    };

    fetchData();
  }, [API_URL]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      {error && <p style={{color:'red'}}>{error}</p>}
      {lineData ? (
        <div>
          <h3>Production Line Details</h3>
          <p>Model: {lineData.model}</p>
          <p>Current Material Count: {lineData.currentMaterialCount}</p>
          <p>Total Outputs: {lineData.totalOutputs}</p>
        </div>
      ) : (
        <p>Loading line data...</p>
      )}
    </div>
  );
}

export default Dashboard;
