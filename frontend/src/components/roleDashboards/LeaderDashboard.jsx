import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Model</TableHead>
                  <TableHead>Current Material Count</TableHead>
                  <TableHead>Total Outputs</TableHead>
                  <TableHead>Predicted Time to Depletion (minutes)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{lineData.model}</TableCell>
                  <TableCell>{lineData.currentMaterialCount}</TableCell>
                  <TableCell>{lineData.totalOutputs}</TableCell>
                  <TableCell>{lineData.predictedTimeToDepletion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mb-6 space-y-1 relative z-10">
          <h2 className="text-lg font-semibold mb-2">Assign Line to Operator</h2>
          <Label htmlFor="operator">Select Operator</Label>
          <Select
            value={selectedOperator}
            onValueChange={(val) => setSelectedOperator(val)}
          >
            <SelectTrigger className="w-full" id="operator">
              <SelectValue placeholder="--Select an operator--" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-zinc-900 text-white border border-zinc-700" >
              {operators.map((operator) => (
                <SelectItem key={operator._id} value={operator._id}
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer">
                  {operator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full bg-blue-500 hover:bg-blue-700 text-white mt-4"
          onClick={handleAssign}>
            Assign Line
          </Button>
        </div>
        <div className="w-full max-w-5xl mx-auto overflow-x-auto">
          <h2 className="text-lg font-semibold mb-2">Production Lines</h2>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-white/20">
                <TableHead className="w-[150px] text-white">Model</TableHead>
                <TableHead className="text-white">Leader</TableHead>
                <TableHead className="text-white">Operator</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow
                  key={line.id}
                  className="border-b border-zinc-800 hover:bg-zinc-800 transition duration-500 ease-in-out"
                >
                  <TableCell className="py-1 px-2">{line.model}</TableCell>
                  <TableCell className="py-1 px-2">{line.leaderName || 'No leader'}</TableCell>
                  <TableCell className="py-1 px-2">{line.operatorName || 'No operator'}</TableCell>
                  <TableCell className="py-1 px-2 text-right">
                    {line.operatorId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 text-xs"
                        onClick={() => handleDetachOperator(line.id)}
                      >
                        Detach Operator
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-400 py-4">
                    No production lines available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default LeaderDashboard;