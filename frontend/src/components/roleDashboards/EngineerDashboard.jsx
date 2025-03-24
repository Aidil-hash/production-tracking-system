// Updated: EngineerDashboard.jsx (ShadCN + Tailwind version)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
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
              <p>Current Material: {analytics.currentMaterialCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

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
