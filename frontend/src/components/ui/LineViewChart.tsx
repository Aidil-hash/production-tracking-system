"use client";
import React, { useState, useEffect, useMemo } from "react";
import { subHours } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
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

export default function LineViewChart() {
  const [error, setError] = useState("");
  const [linesData, setLinesData] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");

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
  
    // Handle new scans
    socket.on("newScan", () => {
      axios.get(`${API_URL}/api/lines`).then((res) => {
        setLinesData(res.data);
      });
    });
  
    // Handle new lines
    socket.on("newLine", () => {
      axios.get(`${API_URL}/api/lines`).then((res) => {
        setLinesData(res.data);
      });
    });

    // Handle new lines
    socket.on("lineStarted", () => {
      axios.get(`${API_URL}/api/lines`).then((res) => {
        setLinesData(res.data);
      });
    });
  
    // Handle target updates
    socket.on("targetUpdate", (data) => {
      setLinesData(prevLines => 
        prevLines.map(line => {
          if (line.id === data.lineId) {
            return {
              ...line,
              efficiencyHistory: [
                ...line.efficiencyHistory,
                {
                  timestamp: new Date(),
                  efficiency: line.efficiencyHistory[line.efficiencyHistory.length - 1]?.efficiency || 0,
                  target: data.targetEfficiency
                }
              ]
            };
          }
          return line;
        })
      );
    });
  
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      setError("Connection error occurred");
    });
  
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError("Failed to connect to server");
    });
  
    return () => {
      socket.off("newScan");
      socket.off("newLine");
      socket.off("targetUpdate");
      socket.off("lineStarted");
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
      const cutoff = subHours(new Date(), hours).getTime();
      return history.filter((point) => new Date(point.timestamp).getTime() >= cutoff);
    };

    const filteredLines = linesData
      .filter((line) => selectedDepartment === "All" || line.department === selectedDepartment)
      .map((line) => {
        // Get the latest efficiency values
        const latestEfficiency = line.efficiencyHistory?.length > 0 
          ? line.efficiencyHistory[line.efficiencyHistory.length - 1]
          : { efficiency: 0, target: 0 };

        return {
          name: line.name,
          currentEfficiency: Number(latestEfficiency.efficiency || 0).toFixed(2),
          targetEfficiency: Number(latestEfficiency.target || 0).toFixed(2)
        };
      });

    return filteredLines;
  }, [linesData, selectedDepartment, timeFilter]);

    console.log("Chart Data:", chartData)

  return (
  <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Production Line Efficiency</CardTitle>
        <CardDescription className="text-gray-800">Real-time efficiency by line</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4">
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
        </div>
        </div>

        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-white p-2 rounded-lg border">
                        <div className="text-gray-800">
                          <p>Model: {payload[0].payload.name}</p>
                          <p>Current: {payload[0].value}/min</p>
                          <p>Target: {payload[0].payload.targetEfficiency}/min</p>
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="currentEfficiency" stackId="a" fill="url(#performanceGradient)" name="Current">
                  <LabelList dataKey="currentEfficiency" position="top" />
                </Bar>
                <Bar dataKey="targetEfficiency" stackId="b" fill="url(#targetGradient)" name="Target">
                  <LabelList dataKey="targetEfficiency" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
