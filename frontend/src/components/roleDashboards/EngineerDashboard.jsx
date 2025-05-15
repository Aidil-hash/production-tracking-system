// Updated: EngineerDashboard.jsx (ShadCN + Tailwind version)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from '../ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer"
import LogoutButton from '../Logout';

function EngineerDashboard() {
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
  const [newTargetEff, setnewTargetEff] = useState('');
  const [message, setMessage] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [lineId, setLineId] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Real-time socket updates
    useEffect(() => {
      const socket = io(API_URL, { transports: ["websocket"] });
  
      socket.on("newScan", () => {
        axios.get(`${API_URL}/api/engineer/allscanlogs`).then((res) => {
          setScanLogs(res.data);
        });
      });
  
      return () => socket.disconnect();
    }, [API_URL]);

    
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

  
  // Handle assigning line to operator
  const handleAssign = async () => {
    try {
      setError('');
      setMessage('');
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/engineer/assignLine`,
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
        `${API_URL}/api/engineer/detachOperator`,
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
    if (!newLineModel || !newLineMaterialCount || !newLineTarget || !newLineDepartment || !newTargetEff=== '') {
      setError('Please enter all details.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/lines`, 
        { model: newLineModel, materialCount: newLineMaterialCount, targetOutputs: newLineTarget, department: newLineDepartment, targetEfficiency: newTargetEff, operatorId: selectedOperator },
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
      {/* Success Message */}
      {message && (
        <p variant="body1" className="text-center mt-2 text-green-500">
          {message}
        </p>
      )}
      <LogoutButton />

      <div className="max-w-md mx-auto">
      </div>

      <div className="w-full max-w-5xl mx-auto overflow-x-auto">
        {/* Wrap the heading in a div with text-center */}
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold text-white">Production Lines</h2>
        </div>
        {/* Wrap the table in a full-width container */}
        <div className="w-full">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-white/20">
                <TableHead className="w-[150px] text-white">Model</TableHead>
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
                  <TableCell className="py-1 px-2">
                    {line.operatorName || 'No operator'}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-right">
                    {line.operatorId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-500 hover:bg-red-700 text-white"
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
        </div>

      <div className="flex justify-center">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Add New Production Line</Button>
        </DrawerTrigger>
        <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-white">Add New Production Line</DrawerTitle>
            <DrawerDescription className="text-white">Set your production line.</DrawerDescription>
          </DrawerHeader>
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
          <Label htmlFor="operator">Select Operator</Label>
          <Select
            value={selectedOperator}
            onValueChange={(val) => setSelectedOperator(val)}
          >
            <SelectTrigger className="w-full" id="operator">
              <SelectValue className="text-white" placeholder="--Select an operator--" />
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
        </div>

        {/*Target Output Field */}
        <div className="mb-4">
          <Label htmlFor="targetEff">Target Efficiency</Label>
          <Input
            id="targetEff"
            type="number"
            value={newTargetEff}
            onChange={(e) => setnewTargetEff(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-md"
            placeholder="Enter target target efficiency"
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
                <SelectValue className="text-white" placeholder="Select the department" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border border-zinc-700">
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
        </form>

          <DrawerFooter>
            <DrawerClose asChild>
              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700"
                onClick={[handleAddNewLine, handleAssign]}
              >
                Add New Line
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
        </DrawerContent>
      </Drawer>
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
