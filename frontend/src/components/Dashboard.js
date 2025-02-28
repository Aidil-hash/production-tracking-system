// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [lines, setLines] = useState([]); // List of all lines for the dropdown
  const [selectedLineId, setSelectedLineId] = useState(''); // Currently selected line ID
  const [lineData, setLineData] = useState(null); // Data for the selected line
  const [error, setError] = useState('');

  // Use the API URL from environment variables
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch list of production lines when the component mounts
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLines(res.data);
        // Optionally, set the first line as selected by default
        if (res.data.length > 0) {
          setSelectedLineId(res.data[0].id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch lines');
      }
    };

    fetchLines();
  }, [API_URL]);

  // Fetch details for the selected line whenever it changes
  useEffect(() => {
    const fetchLineDetails = async () => {
      if (!selectedLineId) return;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines/${selectedLineId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched line data:', res.data); // add logging
        setLineData(res.data);
      } catch (err) {
        console.error('Error fetching line details:', err);
        setError(err.response?.data?.message || 'Failed to fetch line details');
      }
    };
  
    fetchLineDetails();
  }, [API_URL, selectedLineId]);

  // Handle dropdown change
  const handleLineChange = (e) => {
    setSelectedLineId(e.target.value);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {/* Dropdown list of production lines */}
      {lines.length > 0 && (
        <div>
          <label htmlFor="line-select">Select Production Line: </label>
          <select id="line-select" value={selectedLineId} onChange={handleLineChange}>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.model} {/* You can show model or any identifier */}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Display details for the selected line */}
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
