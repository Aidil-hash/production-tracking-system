import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from '../ui/label';
import { toast } from "sonner";
import { subHours } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import LineViewChart from '../ui/LineViewChart';
import LinePerformanceChart from '../ui/LinePerformanceChart';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
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
} from "../ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from "../ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "../ui/accordion";
import LogoutButton from '../Logout';

function EngineerDashboard() {
  const [scanLogs, setScanLogs] = useState([]);
  const [selectedLine, setSelectedLine] = useState('');
  const [lines, setLines] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filteredScanLogs, setFilteredScanLogs] = useState([]);
  const [newLineName, setNewLineName] = useState('');
  const [newLineDepartment, setNewLineDepartment] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedNewOperator, setSelectedNewOperator] = useState(null);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [allOperatorMap, setAllOperatorMap] = useState({});
  const [sortField, setSortField] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const userName = localStorage.getItem('userName');

  // Real-time socket updates
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });

    socket.on("newScan", async () => {
      try {
        if (!selectedLine) return;
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/engineer/scanlogs/${selectedLine}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setScanLogs(res.data);
      } catch (err) {
        console.error("Error fetching updated scan logs:", err);
        toast.error("Error fetching updated scan logs:", err);
      }
    });

    return () => socket.disconnect();
  }, [API_URL, selectedLine]);

  // Fetch the list of operators and lines
  useEffect(() => {
    const fetchOperatorsAndFilter = async () => {
      try {
        const token = localStorage.getItem('token');

        const [usersRes, linesRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/lines`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allOperators = usersRes.data.filter((u) => u.role === 'operator');
        const assignedOperatorIds = linesRes.data.flatMap((line) => line.operatorIds || []);
        const unassignedOperators = allOperators.filter(
          (op) => !assignedOperatorIds.includes(op._id)
        );

        // Create map of all operator ID => name
        const operatorNameMap = {};
        allOperators.forEach(op => {
          operatorNameMap[op._id] = op.name;
        });

        setOperators(unassignedOperators);
        setAllOperatorMap(operatorNameMap);
        setLines(linesRes.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to fetch operators or lines');
      }
    };

    fetchOperatorsAndFilter();
  }, [API_URL]);

  // Fetch scan logs for selected line
  useEffect(() => {
    if (selectedLine) {
      const fetchScanLogs = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/api/engineer/scanlogs/${selectedLine}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setScanLogs(res.data);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to fetch scan logs');
        }
      };
      fetchScanLogs();
    } else {
      setScanLogs([]);
    }
  }, [API_URL, selectedLine]);

  const handleExportCSV = () => {
    if (filteredScanLogs.length === 0) return;

    const headers = ['Model', 'Operator', 'Serial Number', 'First Status', 'Second Status', 'Verified By', 'Scanned At'];
    const rows = filteredScanLogs.map(log => [
      `"${log.model || log.productionLine?.model || ''}"`,
      `"${log.operator?.name || ''}"`,
      `"${log.serialNumber || ''}"`,
      `"${log.serialStatus || ''}"`,
      `"${log.secondSerialStatus || ''}"`,
      `"${log.secondVerifierName || ''}"`,
      `"${log.scannedAt ? new Date(log.scannedAt).toLocaleString() : ''}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `scan_logs_${selectedLine}.csv`);
    link.click();
  };

  const handleExportExcel = () => {
    if (filteredScanLogs.length === 0) return;

    const data = filteredScanLogs.map(log => ({
      Model: log.model || log.productionLine?.model || '',
      Operator: log.operator?.name || '',
      SerialNumber: log.serialNumber || '',
      FirstStatus: log.serialStatus || '',
      SecondStatus: log.secondSerialStatus || '',
      VerifiedBy: log.secondVerifierName || '',
      ScannedAt: log.scannedAt ? new Date(log.scannedAt).toLocaleString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scan Logs');

    XLSX.writeFile(workbook, `scan_logs_${selectedLine}.xlsx`);
  };

  const handleResetLines = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/lines/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Production lines reset successfully!');
      // Refresh lines list
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset production lines');
    }
  };

  // Sort & filter scan logs
  useEffect(() => {
    let sortedLogs = [...scanLogs];
    if (sortField) {
      sortedLogs.sort((a, b) => {
        const aValue = a[sortField]?.toUpperCase?.() || '';
        const bValue = b[sortField]?.toUpperCase?.() || '';
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const filtered = sortedLogs.filter((log) => {
      const model = log.model?.toLowerCase() || log.productionLine?.model?.toLowerCase() || '';
      return model.includes(filterText.toLowerCase());
    });

    setFilteredScanLogs(filtered);
  }, [scanLogs, sortField, sortDirection, filterText]);

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-500 text-white font-semibold';
      case 'NG':
        return 'bg-red-500 text-white font-semibold';
      default:
        return 'bg-yellow-500 text-white font-semibold';
    }
  };

  const handleAddNewLine = async (e) => {
    e.preventDefault();
    if (!newLineName || !newLineDepartment || selectedOperators.length === 0) {
      toast.error('Please enter all details.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/lines`,
        { name: newLineName, department: newLineDepartment, operatorIds: selectedOperators },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("New production line added successfully!",{ className: "animate-fade-in-up"});
      setNewLineName('');
      setNewLineDepartment('');
      setSelectedOperators([]);
      // Refresh lines list
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add new line');
    }
  };

    const handleDeleteLine = async (lineId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/lines/${lineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Production line deleted successfully.');
      // Refresh lines list
        const [usersRes, linesRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/lines`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allOperators = usersRes.data.filter((u) => u.role === 'operator');
        const assignedOperatorIds = linesRes.data.flatMap((line) => line.operatorIds || []);
        const unassignedOperators = allOperators.filter(
          (op) => !assignedOperatorIds.includes(op._id)
        );

        // Create map of all operator ID => name
        const operatorNameMap = {};
        allOperators.forEach(op => {
          operatorNameMap[op._id] = op.name;
        });

        setOperators(unassignedOperators);
        setAllOperatorMap(operatorNameMap);
        setLines(linesRes.data);
    } catch (err) {
      console.error("Failed to delete production line:", err);
      toast.error(err.response?.data?.message || 'Failed to delete production line');
    }
  };

  const handleUpdateLineOperators = async (lineId, selectedNewOperator) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/engineer/addOperator/${lineId}`,
        { lineId, operatorId: selectedNewOperator },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Operator added to line successfully!');
      // Refresh lines list
        const [usersRes, linesRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/lines`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allOperators = usersRes.data.filter((u) => u.role === 'operator');
        const assignedOperatorIds = linesRes.data.flatMap((line) => line.operatorIds || []);
        const unassignedOperators = allOperators.filter(
          (op) => !assignedOperatorIds.includes(op._id)
        );

        // Create map of all operator ID => name
        const operatorNameMap = {};
        allOperators.forEach(op => {
          operatorNameMap[op._id] = op.name;
        });

        setOperators(unassignedOperators);
        setAllOperatorMap(operatorNameMap);
        setLines(linesRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add operator to line');
    }
  };

  const handleDetachOperator = async (lineId, opId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/engineer/detachOperator`,
        { lineId, operatorId: opId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Operator detached from line successfully!');
      // Refresh lines list
        const [usersRes, linesRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/lines`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allOperators = usersRes.data.filter((u) => u.role === 'operator');
        const assignedOperatorIds = linesRes.data.flatMap((line) => line.operatorIds || []);
        const unassignedOperators = allOperators.filter(
          (op) => !assignedOperatorIds.includes(op._id)
        );

        // Create map of all operator ID => name
        const operatorNameMap = {};
        allOperators.forEach(op => {
          operatorNameMap[op._id] = op.name;
        });

        setOperators(unassignedOperators);
        setAllOperatorMap(operatorNameMap);
        setLines(linesRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to detach operator from line');
    }
  };

  return (
    <div className="p-6">
    <div className="flex flex-col items-center justify-between sm:flex-row mb-6">
      <h1 className="text-2xl font-bold text-center sm:text-left">Welcome, {userName}</h1>
      <LogoutButton />
    </div>

      <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="inline-flex items-center p-1 bg-zinc-800 rounded-md border border-zinc-700">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white px-4 py-1.5 text-sm text-zinc-300 rounded-md"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="lineinfo"
          className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white px-4 py-1.5 text-sm text-zinc-300 rounded-md"
        >
          Production Lines
        </TabsTrigger>
        <TabsTrigger
          value="scanlogs"
          className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white px-4 py-1.5 text-sm text-zinc-300 rounded-md"
        >
          Scan Logs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
      <AnimatePresence mode="wait">
      <motion.div
        key="overview"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
      <div>
      <Carousel className="w-full max-w-[1400px] mx-auto mb-6">
        <CarouselContent className="flex gap-4">
          <CarouselItem className="sm:w-full md:w-1/2 lg:w-1/3">
          <LineViewChart/>
          </CarouselItem>
          <CarouselItem className="sm:w-full md:w-1/2 lg:w-1/3">
          <LinePerformanceChart/>
          </CarouselItem>
          </CarouselContent>
        <CarouselNext/>
        <CarouselPrevious/>
      </Carousel>
      </div>

      <div className="mx-auto max-w-[1027px] mb-4">
        <Button
          variant="destructive"
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={handleResetLines}
        >
          Reset Production Lines
        </Button>
      </div>
      </motion.div>
      </AnimatePresence>
      </TabsContent>

      <TabsContent value="lineinfo" className="space-y-6">
      <AnimatePresence mode="wait">
      <motion.div
        key="lineinfo"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
      <div className="w-full max-w-5xl mx-auto overflow-x-auto">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold text-white">Production Lines</h2>
        </div>
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20">
                <TableHead className="w-[150px] text-white">Line</TableHead>
                <TableHead className="text-white">Operator</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
                <TableHead className="w-[100px] text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <React.Fragment key={line.id}>
                  <TableRow
                    className="cursor-pointer border-b border-zinc-800 hover:bg-zinc-800"
                    onClick={() => setOpenRow(openRow === line.id ? null : line.id)}
                  >
                    <TableCell>{line.name}</TableCell>
                    <TableCell>{line.operatorName || 'No operator'}</TableCell>
                    <TableCell className="text-right">Expand</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500 hover:bg-red-700 text-white"
                          >
                            DELETE
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-100 text-gray-900 border border-zinc-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-yellow-400">
                              <AlertTriangle className="w-5 h-5" />
                              Are you sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-700">
                              This will permanently delete the production line <strong>{line.name}</strong>. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-700 hover:bg-zinc-600 text-white">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDeleteLine(line.id)}
                            >
                              Yes, Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>

                  <AnimatePresence>
                    {openRow === line.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-zinc-900 border-t border-zinc-700"
                      >
                        <TableCell colSpan={4} className="p-4 text-sm text-zinc-300">
                          <p><strong>Department:</strong> {line.department || '—'}</p>
                          <p><strong>Line Status:</strong> <span className={`text-[14px] ${
                            line.linestatus === 'RUNNING' 
                              ? 'text-green-500' 
                              : 'text-red-500'
                            }`}><strong> {line.linestatus}</strong></span>
                          </p>
                          <p><strong>Total Output:</strong> {line.totalOutputs || '0'}</p>
                          <p><strong>Target Output:</strong> {line.targetOutputs || '0'}</p>
                          <p><strong>Operators:</strong></p>
                          <ul className="list-disc ml-5 space-y-1">
                            {line.operatorIds?.map((opId, idx) => (
                              <li key={opId} className="flex items-center justify-between ml-10 border-b border-zinc-700 pb-2">
                                <span>{allOperatorMap[opId] || 'Unknown'}</span>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="bg-red-500 hover:bg-red-700 text-white"
                                    >
                                      DETACH
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-zinc-100 text-gray-900 border border-zinc-700">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2 text-yellow-400">
                                        <AlertTriangle className="w-5 h-5" />
                                        Are you sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-zinc-700">
                                        This will remove Operator from <strong>{line.name}</strong>. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-700 hover:bg-zinc-600 text-white">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleDetachOperator(line.id, opId)}
                                      >
                                        Yes, Detach
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4">
                            <label className="block mb-1 text-white">Add Operator:</label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedNewOperator || ''}
                                onValueChange={setSelectedNewOperator}
                              >
                                <SelectTrigger className="w-64 bg-zinc-800 text-white">
                                  <SelectValue placeholder="Select operator" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 text-white">
                                  {operators.map(op => (
                                    <SelectItem key={op._id} value={op._id} className="hover:bg-gray-700">{op.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => {
                                  if (selectedNewOperator) {
                                    handleUpdateLineOperators(line.id, selectedNewOperator);
                                    setSelectedNewOperator(null);
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        </div>
      
      <div>
        <h5 className="mb-4 text-lg font-semibold text-center">
          Add New Production Line
        </h5>
        <Accordion type="single" collapsible className="w-full max-w-7xl mx-auto">
          <AccordionItem value="add-new-line">
            <AccordionTrigger className="text-white border-t border-white px-4 py-3 bg-zinc-900 hover:bg-zinc-800 transition-colors duration-300">
              <div className="flex items-center max-w-6xl justify-between mx-auto">
                <span>Add New Line</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className=" text-white p-4 rounded-md">
              <div className="max-w-6xl mx-auto">
              <form onSubmit={handleAddNewLine}>
                <div className="mb-4">
                  <Label htmlFor="lineName">Line Name/Number</Label>
                  <Input
                    id="lineName"
                    value={newLineName}
                    onChange={e => setNewLineName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-md text-white"
                    placeholder="Enter line name/number"
                    required
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="operator">Select Operator(s)</Label>
                  <MultiSelectDropdown
                    options={operators}
                    selected={selectedOperators}
                    onChange={setSelectedOperators}
                    placeholder="-- Select operators --"
                    className="w-full border border-gray-300 p-2 rounded-md text-white"
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={newLineDepartment}
                    onValueChange={val => setNewLineDepartment(val)}
                  >
                    <SelectTrigger className="w-full text-white">
                      <SelectValue placeholder="Select the department" className="z-50"/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-white border border-zinc-700 z-[100]">
                      {["E2 Drum", "E3 Compact", "E3 Non-Compact", "E4 Piano", "E4 Keyboard"].map(dept => (
                        <SelectItem
                          key={dept}
                          value={dept}
                          className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer"
                        >
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700"
                >
                  Add New Line
                </button>
              </form>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      </motion.div>
      </AnimatePresence>
      </TabsContent>

      <TabsContent value="scanlogs" className="space-y-6">
      <AnimatePresence mode="wait">
      <motion.div
        key="scanlogs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
      {/* --- Scan Logs Section --- */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Scan Logs</h2>

        <div className="flex items-center gap-2 mb-2">
          <Select
            value={selectedLine}
            onValueChange={val => setSelectedLine(val)}
          >
            <SelectTrigger className="w-72 text-white">
              <SelectValue placeholder="Select Line" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 text-white border border-zinc-700 z-[100]">
              {lines.map(line => (
                <SelectItem key={line.id} value={line.id}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by model"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            disabled={!selectedLine}
          />
          <Button
            onClick={handleExportCSV}
            disabled={!selectedLine || filteredScanLogs.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Export CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={!selectedLine || filteredScanLogs.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Export Excel
          </Button>
        </div>

        {!selectedLine && (
          <p className="text-center text-zinc-400">Please select a line to see scan logs.</p>
        )}

        {selectedLine && filteredScanLogs.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-white">
                <tr>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Operator</th>
                  <th className="px-4 py-2">Serial Number</th>
                  <th
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => {
                      setSortField('serialStatus');
                      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    First Status {sortField === 'serialStatus' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-2">Second Status</th>
                  <th className="px-4 py-2">Verified By</th>
                  <th className="px-4 py-2">Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {filteredScanLogs.map((log, index) => (
                  <tr key={index} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{log.model || log.productionLine?.model || 'Unknown'}</td>
                    <td className="px-4 py-2">{log.operator?.name || 'Unknown'}</td>
                    <td className="px-4 py-2">{log.serialNumber || 'N/A'}</td>
                    <td className={`px-4 py-2 rounded ${getStatusColorClass(log.serialStatus)}`}>
                      {log.serialStatus || 'Pending'}
                    </td>
                    <td className={`px-4 py-2 rounded ${getStatusColorClass(log.secondSerialStatus)}`}>
                      {log.secondSerialStatus || 'Pending'}
                    </td>
                    <td className="px-4 py-2">
                      {log.verifiedBy ? log.secondVerifierName || 'Unknown' : 'N/A'}
                    </td>
                    <td className="px-4 py-2">{ log.scannedAt ? subHours(new Date(log.scannedAt), 8) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedLine ? (
          <p className="text-center">No scan logs available for this line.</p>
        ) : null}
      </div>
      </motion.div>
      </AnimatePresence>
      </TabsContent>
      </Tabs>
    </div>
  );
}

export default EngineerDashboard;
