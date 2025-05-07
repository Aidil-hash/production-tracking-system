"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area as RechartsArea,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartTooltip,
} from "../ui/chart";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from '../ui/label';

export default function LinePerformanceChart() {
  const [error, setError] = useState("");
  const [linesData, setLinesData] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch initial production lines data
  useEffect(() => {
    const fetchLinesData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/lines`);
        setLinesData(res.data.map((line: any) => ({
          ...line,
          efficiencyHistory: line.efficiencyHistory || []
        })));
      } catch (err) {
        setError("Failed to fetch production lines");
      }
    };
    fetchLinesData();
  }, [API_URL]);

  // Socket.io setup for real-time updates
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"] });

    socket.on("newScan", (scanData) => {
      setLinesData(prev => prev.map(line => {
        if (line._id === scanData.productionLine) {
          return {
            ...line,
            efficiencyHistory: [
              ...line.efficiencyHistory,
              {
                timestamp: scanData.scannedAt,
                efficiency: scanData.efficiency
              }
            ]
          };
        }
        return line;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL]);

  // Process data for charts
  const chartData = linesData
    .filter(line => selectedDepartment === "All" || line.department === selectedDepartment)
    .map(line => ({
      _id: line._id,
      name: line.model,
      data: line.efficiencyHistory.map((point: any) => ({
        time: new Date(point.timestamp).getTime(),
        performance: point.efficiency,
      })),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Line Efficiency</CardTitle>
        <CardDescription>
          Real-time efficiency metrics from scanned serials
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Label>Filter by Department</Label>
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Departments</SelectItem>
              <SelectItem value="E2 Drum">E2 Drum</SelectItem>
              <SelectItem value="E3 Compact">E3 Compact</SelectItem>
              <SelectItem value="E3 Non-Compact">E3 Non-Compact</SelectItem>
              <SelectItem value="E4 Piano">E4 Piano</SelectItem>
              <SelectItem value="E4 Keyboard">E4 Keyboard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chartData.map((line) => (
              <Card key={line._id}>
                <CardHeader>
                  <CardTitle>{line.name}</CardTitle>
                  <CardDescription>{line.department}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={line.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
                        />
                        <YAxis
                          tickFormatter={(value) => `${value.toFixed(1)}/min`}
                        />
                        <RechartsArea
                          type="monotone"
                          dataKey="performance"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.3}
                        />
                        <ChartTooltip
                          content={({ active, payload }) => (
                            <div className="bg-background p-2 rounded-lg border">
                              {payload?.map((entry) => (
                                <div key={entry.name}>
                                  Efficiency: {entry.value?.toFixed(2)}/min
                                  <br />
                                  {format(
                                    new Date(entry.payload.time),
                                    'MMM dd, HH:mm:ss'
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}