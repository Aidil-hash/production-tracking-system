"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { format, subHours } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  AreaChart,
  XAxis,
  Area as RechartsArea,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Label } from "../ui/label";

export default function LinePerformanceChartNoAccordion() {
  const [error, setError] = useState("");
  const [linesData, setLinesData] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");

  const chartsContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch initial lines
  useEffect(() => {
    const fetchLinesData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/lines`);
        setLinesData(
          res.data.map((line: any) => ({
            ...line,
            efficiencyHistory: line.efficiencyHistory || [],
          }))
        );
        console.log("line Data:", res.data);
      } catch (err) {
        setError("Failed to fetch production lines");
      }
    };
    fetchLinesData();
  }, [API_URL]);

  // Real-time socket updates
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });
  
    const refreshData = () => {
      axios.get(`${API_URL}/api/lines`).then((res) => {
        setLinesData(
          res.data.map((line: any) => ({
            ...line,
            efficiencyHistory: line.efficiencyHistory || [],
          }))
        );
      });
    };

    socket.on("newScan", refreshData);
    socket.on("newScanBatch", refreshData);
    socket.on("newLine", refreshData);
    socket.on("lineStarted", refreshData);
    socket.on("lineReset", refreshData);
    socket.on("lineDeleted", refreshData);
    socket.on("targetUpdates", refreshData);
  
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      setError("Connection error occurred");
    });
  
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError("Failed to connect to server");
    });
  
    return () => {
      socket.off("newScan", refreshData);
      socket.off("newLine", refreshData);
      socket.off("targetUpdates", refreshData);
      socket.off("lineStarted", refreshData);
      socket.off("lineReset", refreshData);
      socket.off("newScanBatch", refreshData);
      socket.off("lineDeleted", refreshData);
      socket.off("error");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [API_URL]);

  // Time filtering helper
  const chartData = useMemo(() => {
    const getFilteredData = (history: any[]) => {
      if (timeFilter === "All") return history;
      const hours = parseInt(timeFilter.replace("h", ""));
      const cutoff = subHours(new Date(), hours).getTime(); // Local time cutoff
      return history.filter((point) => {
        // Server timestamp is already Malaysia Time (UTC+8), but JS parses it as local time.
        // Subtract 8 hours to align with the local time for filtering.
        const adjustedTimestamp = subHours(new Date(point.timestamp), 8).getTime();
        return adjustedTimestamp >= cutoff;
      });
    };
  
    return linesData
      .filter((line) => selectedDepartment === "All" || line.department === selectedDepartment)
      .map((line) => ({
        _id: line.id,
        name: line.name,
        department: line.department,
        linestatus: line.linestatus,
        totalOutputs: line.totalOutputs,
        targetOutputs: line.targetOutputs,
        data: getFilteredData(line.efficiencyHistory || [])
          .map((point: any) => {
            // Server timestamp is Malaysia Time (UTC+8), but JS parses it as local time.
            // Subtract 8 hours to display correctly.
            const malaysiaTime = subHours(new Date(point.timestamp), 8);
            return {
              time: malaysiaTime.getTime(), // Display-adjusted time
              performance: Number(point.efficiency) || 0,
              target: Number(point.target) || 0,
              rejectedOutputs: Number(point.rejectedOutputs) || 0,
            };
          })
          .sort((a, b) => a.time - b.time),
      }));
  }, [linesData, selectedDepartment, timeFilter]);

  // Fullscreen handler for all charts together
  const handleFullscreen = () => {
    console.log("chartsContainerRef.current:", chartsContainerRef.current);
    const el = chartsContainerRef.current;
    if (el) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        (el as any).msRequestFullscreen();
      }
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Production Line Efficiency</CardTitle>
        <CardDescription className="text-gray-800">Real-time efficiency by line</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <Label className="text-gray-800">Filter by Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px] text-gray-800">
                <SelectValue placeholder="Select department" className="text-gray-800"/>
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-800 border border-gray-200 z-10">
                <SelectItem value="All" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">All</SelectItem>
                <SelectItem value="E2 Drum" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">E2 Drum</SelectItem>
                <SelectItem value="E3 Compact" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">E3 Compact</SelectItem>
                <SelectItem value="E3 Non-Compact" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">E3 Non-Compact</SelectItem>
                <SelectItem value="E4 Piano" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">E4 Piano</SelectItem>
                <SelectItem value="E4 Keyboard" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">E4 Keyboard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-800">Time Range</Label>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[200px] text-gray-800">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-800 border border-gray-200 z-20">
                <SelectItem value="1h" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">Last 1 Hour</SelectItem>
                <SelectItem value="6h" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">Last 6 Hours</SelectItem>
                <SelectItem value="12h" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">Last 12 Hours</SelectItem>
                <SelectItem value="24h" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">Last 24 Hours</SelectItem>
                <SelectItem value="All" className="hover:bg-orange-600 focus:bg-orange-600 cursor-pointer">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Fullscreen button for all charts */}
          <div className="flex items-end ml-auto">
            <button
              className="text-gray-800 border px-3 py-1 rounded hover:bg-gray-300"
              onClick={handleFullscreen}
              type="button"
              title="Fullscreen All Charts"
            >
              ⬜️ Fullscreen All
            </button>
          </div>
        </div>

        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div ref={chartsContainerRef} className="space-y-8">
            {chartData.map((line) => (
              <div key={line._id || line.name} className="bg-white rounded-lg shadow border px-4 py-4 mb-4">
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <div className="text-xl font-semibold text-gray-800">{line.name} – {line.department}</div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <div className="text-gray-800 text-xl"><strong>Total Outputs:</strong> {line.totalOutputs}</div>
                    <div className="text-gray-800 text-[14px]">
                      <span className={`px-2 py-1 rounded-md border text-[14px] ${
                        line.linestatus === 'RUNNING' 
                          ? 'bg-green-500 text-green-900' 
                          : 'bg-red-500 text-red-800'
                      }`}>
                        {line.linestatus}
                      </span>
                    </div>
                    <div className="text-gray-800 text-xl">
                      <strong className="text-[14px]">Target Rate:</strong>{" "}
                      {(line.data.length > 0
                        ? (line.data.reduce((sum, d) => sum + d.target, 0) / line.data.length).toFixed(2)
                        : "0.00")} /min
                    </div>
                    <div className="text-gray-800 text-xl">
                      <strong className="text-[14px]">Average Rate:</strong>{" "}
                      {(line.data.length > 0 ? (line.data.reduce((sum, d) => sum + d.performance, 0) / line.data.length).toFixed(2) : "0.00")} /min
                    </div>
                  </div>
                </div>
                <div>
                  {line.data.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">No efficiency data available.</div>
                  ) : (
                    <div style={{ width: '100%', height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={line.data} stackOffset="expand">
                          <defs>
                            <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2EDB37" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#2EDB37" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="time"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(ts) => format(new Date(ts), "HH:mm")}
                          />
                          <RechartsArea
                            type="monotone"
                            dataKey="performance"
                            stroke="#4F46E5"
                            fill="url(#performanceGradient)"
                            name="performance"
                          />
                          <RechartsArea
                            type="monotone"
                            dataKey="target"
                            stroke="#2EDB37"
                            fill="url(#targetGradient)"
                            name="target"
                          />
                          <Tooltip
                            content={({ active, payload }) =>
                              active && payload?.length ? (
                                <div className="bg-white p-2 rounded-lg border">
                                  <div className="text-gray-800">
                                    Efficiency: {payload[0].value.toFixed(2)}/min<br />
                                    {format(new Date(payload[0].payload.time), "MMM dd, HH:mm:ss")}<br />
                                    <strong>Target:</strong> {payload[0].payload.target.toFixed(2)}/min<br />
                                    <strong>Rejected Outputs:</strong> {payload[0].payload.rejectedOutputs.toFixed(2)}<br/>
                                  </div>
                                </div>
                              ) : null
                            }
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex items-center justify-center w-full gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4F46E5]"></div>
            <span className="text-sm text-gray-800">Current Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2EDB37]"></div>
            <span className="text-sm text-gray-800">Target Efficiency</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}