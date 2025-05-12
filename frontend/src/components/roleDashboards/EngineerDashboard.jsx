// Updated: EngineerDashboard.jsx (ShadCN + Tailwind version)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from '../ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import LogoutButton from '../Logout';

function EngineerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);
  const [error, setError] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [lines, setLines] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filteredScanLogs, setFilteredScanLogs] = useState([]);
  const [newLineModel, setNewLineModel] = useState('');
  const [newLineMaterialCount, setNewLineMaterialCount] = useState('');
  const [newLineTarget, setNewLineTarget] = useState('');
  const [newLineDepartment, setNewLineDepartment] = useState('');
  const [message, setMessage] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('newScan', (data) => {
      if (data.productionLine === selectedLine) {
        setScanLogs((prevLogs) => [
          {
            operator: data.operator.name,
            serialNumber: data.serialNumber,
            scannedAt: data.scannedAt,
            lineModel: data.productionLine.model,
          },
          ...prevLogs,
        ]);
      }
    });
    return () => socket.disconnect();
  }, [API_URL, selectedLine]);

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
        if (res.data.length > 0) setSelectedLine(res.data[0].id);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch lines');
      }
    };
    fetchLines();
  }, [API_URL]);

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
          setError(err.response?.data?.message || 'Failed to fetch analytics');
        }
      };
      fetchAnalytics();
    }
  }, [API_URL, selectedLine]);

  useEffect(() => {
    if (selectedLine) {
      const fetchScanLogs = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/api/engineer/allscanlogs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setScanLogs(res.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch scan logs');
        }
      };
      fetchScanLogs();
    }
  }, [API_URL, selectedLine]);

  useEffect(() => {
    if (!filterText) {
      setFilteredScanLogs(scanLogs);
    } else {
      const filtered = scanLogs.filter((log) => {
        const lineModel = log.productionLine?.model?.toLowerCase() || '';
        return lineModel.includes(filterText.toLowerCase());
      });
      setFilteredScanLogs(filtered);
    }
  }, [filterText, scanLogs]);

  const handleAddNewLine = async (e) => {
    e.preventDefault();
    if (!newLineModel || !newLineMaterialCount || !newLineTarget || !newLineDepartment === '') {
      setError('Please enter all details.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/lines`, 
        { model: newLineModel, materialCount: newLineMaterialCount, targetOutputs: newLineTarget, department: newLineDepartment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optionally, refresh the lines list after adding a new line
      setMessage('New production line added successfully!');
      setError('');
      setNewLineModel('');
      setNewLineMaterialCount('');
      setNewLineTarget('');
      setNewLineDepartment('');
      // Refresh lines
      const linesRes = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(linesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add new line');
      setMessage('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Engineer Dashboard</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <LogoutButton />

      <div className="max-w-md mx-auto">
        <label className="block mb-2 text-sm font-medium">Select Production Line</label>
        <Select onValueChange={(val) => setSelectedLine(val)} value={selectedLine}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="--Select a line--" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-zinc-900 text-white">
            {lines.map((line) => (
              <SelectItem
                key={line.id}
                value={line.id}
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                {line.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="space-y-2">
              <h2 className="text-lg font-semibold">Efficiency Metrics</h2>
              <p>Overall Efficiency: {analytics.overallEfficiency}%</p>
              <p>Avg Outputs per Minute: {analytics.efficiencyPerMinute}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <h2 className="text-lg font-semibold">Material Forecast</h2>
              <p>Time to Depletion: {analytics.predictedTimeToDepletion} mins</p>
              <p>Total Output: {analytics.totalOutputs}</p>
            </CardContent>
          </Card>
        </div>
      )}

    <div className="mt-4 mx-auto max-w-600 p-4 border border-gray-300 rounded-md">
      <h5 className= "mb-4 text-lg font-semibold text-center">
        Add New Production Line
      </h5>

      <form onSubmit={handleAddNewLine}>
        {/* Model Field */}
        <div className="mb-4">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={newLineModel}
            onChange={(e) => setNewLineModel(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-md"
            placeholder="Enter model"
          />
        </div>

        {/* Initial Material Count Field */}
        <div className="mb-4">
          <Label htmlFor="materialCount">Initial Material Count</Label>
          <Input
            id="materialCount"
            type="number"
            value={newLineMaterialCount}
            onChange={(e) => setNewLineMaterialCount(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-md"
            placeholder="Enter material count"
          />
        </div>

        {/*Target Output Field */}
        <div className="mb-4">
          <Label htmlFor="linetargetOutputs">Target Output</Label>
          <Input
            id="linetargetOutputs"
            type="number"
            value={newLineTarget}
            onChange={(e) => setNewLineTarget(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-md"
            placeholder="Enter target output"
          />
        </div>

        {/*Department Field */}
          <div className="space-y-1 relative z-10 mb-4">
            <Label htmlFor="newdepartment">Department</Label>
            <Select onValueChange={(value) => setNewLineDepartment(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select the department" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-zinc-900 text-white border border-zinc-700">
              <SelectItem
                value="E2 Drum"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                E2 Drum
              </SelectItem>
              <SelectItem
                value="E3 Compact"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                E3 Compact
              </SelectItem>
              <SelectItem
                value="E3 Non-Compact"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                E3 Non-Compact
              </SelectItem>
              <SelectItem
                value="E4 Piano"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                E4 Piano
              </SelectItem>
              <SelectItem
                value="E4 Keyboard"
                className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
              >
                E4 Keyboard
              </SelectItem>
            </SelectContent>
            </Select>
          </div>

        {/* Submit Button */}
        <button
                type="submit"
                className="w-full py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700"
                onClick={handleAddNewLine}
              >
                Add New Line
              </button>
      </form>

      {/* Success Message */}
      {message && (
        <p variant="body1" className="text-center mt-2 text-green-500">
          {message}
        </p>
      )}
    </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Scan Logs</h2>
        <Input
          placeholder="Filter by model"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />

        {filteredScanLogs.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-white">
                <tr>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Operator</th>
                  <th className="px-4 py-2">Serial Number</th>
                  <th className="px-4 py-2">Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {filteredScanLogs.map((log, index) => (
                  <tr key={index} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{log.productionLine?.model || 'Unknown'}</td>
                    <td className="px-4 py-2">{log.operator?.name || 'Unknown'}</td>
                    <td className="px-4 py-2">{log.serialNumber || 'N/A'}</td>
                    <td className="px-4 py-2">{log.scannedAt ? new Date(log.scannedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center">No scan logs available.</p>
        )}
      </div>
    </div>
  );
}

export default EngineerDashboard;
