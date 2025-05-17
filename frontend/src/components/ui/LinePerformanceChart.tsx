"use client";
import React, { useState, useEffect } from "react";
import { format, subHours } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area as RechartsArea,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "../ui/accordion";

export default function LinePerformanceChart() {
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

    socket.on("newScan", () => {
      axios.get(`${API_URL}/api/lines`).then((res) => {
        setLinesData(res.data);
      });
    });

    return () => socket.disconnect();
  }, [API_URL]);

    // Real-time socket updates
    useEffect(() => {
      const socket = io(API_URL, { transports: ["websocket"] });
  
      socket.on("newLine", () => {
        axios.get(`${API_URL}/api/lines`).then((res) => {
          setLinesData(res.data);
        });
      });
  
      return () => socket.disconnect();
    }, [API_URL]);

  // Time filtering helper
  const getFilteredData = (history: any[]) => {
    if (timeFilter === "All") return history;
    const hours = parseInt(timeFilter.replace("h", ""));
    const cutoff = subHours(new Date(), hours).getTime();
    return history.filter((point) => new Date(point.timestamp).getTime() >= cutoff);
  };

  const chartData = linesData
    .filter((line) => selectedDepartment === "All" || line.department === selectedDepartment)
    .map((line,index) => ({
      _id: line.id,
      name: line.model,
      department: line.department,
      linestatus: line.linestatus,
      data: getFilteredData(line.efficiencyHistory).map((point: any) => ({
        time: new Date(point.timestamp).getTime(),
        performance: point.efficiency,
        target: point.target,
      })),
    }));
    console.log("Chart Data:", chartData)

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
        </div>

        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {chartData.map((line) => (
              <AccordionItem key={line._id || line.name} value={line._id || line.name} className="bg-white">
                <AccordionTrigger className="text-gray-800">
                  {line.name} – {line.department}
                </AccordionTrigger>
                <AccordionContent>
                  {line.data.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">No efficiency data available.</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground px-1">
                        <div className="text-gray-800" ><strong>Total Outputs:</strong> {line.data.length}</div>
                        <div className="text-gray-800">
                          <strong>Line Status:</strong>{' '}
                          <span className={`px-2 py-1 rounded-md border ${
                            line.linestatus === 'RUNNING' 
                              ? 'bg-green-500 text-green-900' 
                              : 'bg-red-500 text-red-800'
                          }`}>
                            {line.linestatus}
                          </span>
                        </div>
                        <div className="text-gray-800">
                          <strong>Average Efficiency:</strong>{" "}
                          {(line.data.reduce((sum, d) => sum + d.performance, 0) / line.data.length).toFixed(2)} /min
                        </div>
                      </div>

                      <div style={{ width: '100%', height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={line.data} stackOffset="expand">
                          <CartesianGrid strokeDasharray="1 1" />
                          <XAxis
                            dataKey="time"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(ts) => format(new Date(ts), "HH:mm")}
                          />
                          <YAxis tickFormatter={(v) => `${v.toFixed(1)}/min`} />
                          <RechartsArea
                            type="monotone"
                            dataKey="performance"
                            stroke="#4F46E5"
                            fill="#4F46E5"
                            fillOpacity={0.3}
                          />
                          <RechartsArea
                            type="monotone"
                            dataKey="target"
                            stroke="#2EDB37"
                            fill="#2EDB37"
                            fillOpacity={0.3}
                          />
                          <Tooltip
                            content={({ active, payload }) =>
                              active && payload?.length ? (
                                <div className="bg-white p-2 rounded-lg border">
                                  <div className="text-gray-800">
                                    Efficiency: {payload[0].value.toFixed(2)}/min<br />
                                    {format(new Date(payload[0].payload.time), "MMM dd, HH:mm:ss")}<br />
                                    <strong>Target:</strong> {payload[0].payload.target}/min<br />
                                  </div>
                                </div>
                              ) : null
                            }
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
