import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'; // Keeping Table for now
import axios from 'axios';
import { Button } from "../ui/button"; // ShadCN Button
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select"; // ShadCN Select
import { Label } from "../ui/label"; // ShadCN Label
import { Card, CardHeader, CardContent } from "../ui/card"; // ShadCN Card
import LogoutButton from '../Logout';

function LeaderDashboard() {
  const [lineData, setLineData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [lines, setLines] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch the leader's assigned production line
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

  // Fetch production line details
  useEffect(() => {
    if (!lineId) return;
    const fetchLineData = async () => {
      try {
        setError('');
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines/${lineId}/predict`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
        setError('');
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

  // Fetch list of all production lines
  useEffect(() => {
    const fetchLines = async () => {
      try {
        setError('');
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
      setError('');
      setMessage('');
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leaders/assignLine`,
        { lineId, operatorId: selectedOperator },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Line assigned to operator successfully!');
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign line to operator');
    }
  };

  // Handle detaching operator from a production line
  const handleDetachOperator = async (lineId) => {
    try {
      setError('');
      setMessage('');
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leaders/detachOperator`,
        { lineId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Operator detached from line successfully!');
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to detach operator from line');
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Leader Dashboard</h1>
          <LogoutButton />
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}
        {lineData && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Production Line Details</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2">Model</th>
                  <th className="border border-gray-300 px-4 py-2">Current Material Count</th>
                  <th className="border border-gray-300 px-4 py-2">Total Outputs</th>
                  <th className="border border-gray-300 px-4 py-2">Predicted Time to Depletion (minutes)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">{lineData.model}</td>
                  <td className="border border-gray-300 px-4 py-2">{lineData.currentMaterialCount}</td>
                  <td className="border border-gray-300 px-4 py-2">{lineData.totalOutputs}</td>
                  <td className="border border-gray-300 px-4 py-2">{lineData.predictedTimeToDepletion}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Assign Line to Operator</h2>
          <Label htmlFor="operator">Select Operator</Label>
          <Select
            value={selectedOperator}
            onValueChange={(val) => setSelectedOperator(val)}
          >
            <SelectTrigger className="w-full" id="operator">
              <SelectValue placeholder="--Select an operator--" />
            </SelectTrigger>
            <SelectContent>
              {operators.map((operator) => (
                <SelectItem key={operator._id} value={operator._id}>
                  {operator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full mt-4 bg-blue-650 hover:bg-red-750 text-white" onClick={handleAssign}>
            Assign Line
          </Button>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Production Lines</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">ID</th>
                <th className="border border-gray-300 px-4 py-2">Model</th>
                <th className="border border-gray-300 px-4 py-2">Operator</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="border border-gray-300 px-4 py-2">{line.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{line.model}</td>
                  <td className="border border-gray-300 px-4 py-2">{line.operatorName || 'No operator assigned'}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {line.operatorId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-500 hover:bg-red-650 text-white"
                        onClick={() => handleDetachOperator(line.id)}
                      >
                        Detach Operator
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-center">
                    No production lines available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default LeaderDashboard;