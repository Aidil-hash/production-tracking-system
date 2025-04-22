"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area as RechartsArea,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Label } from '../ui/label';

export default function LinePerformanceChart() {
  // State declarations
  const [error, setError] = useState("");
  const [linesData, setLinesData] = useState<any[]>([]); // Array of all lines' data
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [lineId, setLineId] = useState<string>("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch all production lines
  useEffect(() => {
    const fetchLinesData = async () => {
      try {
        setError("");
        const res = await axios.get(`${API_URL}/api/lines`);
        setLinesData(res.data);
        console.log("Fetched lines data:", res.data);
      } catch (err) {
        console.error("Failed to fetch lines:", err);
        setError(err.response?.data?.message || "Failed to fetch lines.");
      }
    };
    fetchLinesData();
  }, [API_URL]);

  // Handle sorting by department
  const handleDepartmentSort = (department: string) => {
    setSelectedDepartment(department);
  };

  // Filter lines based on department selection
  const filteredLines = selectedDepartment === "All" ? linesData : linesData.filter(line => line.department === selectedDepartment);

  // Chart data mapping
  const chartData = filteredLines.map((line: any) => ({
    name: line.model,
    data: line.efficiencyData?.map((point: any) => ({
      time: new Date(point.timestamp).getTime(),
      performance: point.efficiency,
    })) || [],
  }));

  const currentDate = new Date();
  const formattedDate = format(currentDate, "MMMM dd, yyyy");

  // Handle adding new chart
  const addChart = (line: any) => {
    setLinesData((prevState) => [...prevState, line]); // Add new line data
  };

  // Socket.io setup for real-time updates
  useEffect(() => {
    if (!lineId) return; // Ensure lineId is set before establishing a socket connection

    console.log("Connecting to socket...");
    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    // Socket event for real-time updates (only update the selected line's data)
    socket.on("lineOutputUpdated", (updatedLine) => {
      console.log("Received real-time update for line:", updatedLine);

      // Ensure the updated line matches the selected line ID before updating
      if (updatedLine._id === lineId) {
        setLinesData((prevData) => {
          // If previous data exists, we want to preserve it and append new data
          const updatedEfficiencyData = updatedLine.efficiencyData || [];

          // Return the new state by merging the updated line data
          return prevData.map((line) => {
            if (line._id === updatedLine._id) {
              return {
                ...line,
                efficiencyData: [
                  ...line.efficiencyData || [],
                  ...updatedEfficiencyData, // Append updated data
                ],
              };
            }
            return line;
          });
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
      console.log("Socket connection closed");
    };
  }, [API_URL, lineId]); // Only establish the socket connection when lineId changes

  return (
    <div>
        <div className="flex justify-between items-center">
          <CardTitle>Line Performance</CardTitle>
        </div>
        <CardDescription>Performance metrics in real-time</CardDescription>

        {/* Department Sorting */}
          <div className="space-y-1 relative z-10 mb-4">
            <Label htmlFor="newdepartment">Department</Label>
            <Select onChange={(value) => handleDepartmentSort(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select the department" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-zinc-900 text-white border border-zinc-700">
              <SelectItem
                value="E2 Drum"
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer"
              >
                E2 Drum
              </SelectItem>
              <SelectItem
                value="E3 Compact"
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer"
              >
                E3 Compact
              </SelectItem>
              <SelectItem
                value="E3 Non-Compact"
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer"
              >
                E3 Non-Compact
              </SelectItem>
              <SelectItem
                value="E4 Piano"
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer"
              >
                E4 Piano
              </SelectItem>
              <SelectItem
                value="E4 Keyboard"
                className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer"
              >
                E4 Keyboard
              </SelectItem>
            </SelectContent>
            </Select>
          </div>

      <CardContent>
        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : filteredLines.length === 0 ? (
          <p className="text-center text-gray-500">No data available for the selected department.</p>
        ) : (
          <div className="charts-grid">
            {chartData.map((lineData, index) => (
              <Card key={index}>
                <CardContent>
                  <AreaChart data={lineData.data} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis
                      dataKey="performance"
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value}
                      domain={[0, "auto"]}
                    />
                    <ChartTooltip cursor={true} content={<ChartTooltipContent hideLabel />} />
                    <RechartsArea
                      dataKey="performance"
                      type="step"
                      fill="var(--color-performance)"
                      fillOpacity={0.4}
                      stroke="var(--color-performance)"
                    />
                  </AreaChart>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add More Button */}
        <div className="add-more">
          <button onClick={() => addChart(filteredLines[1])}
          className="btn-add-more hover:bg-gray-500 focus:bg-gray-500 cursor-pointer px-3 py-1 ">
            Add More
            </button>
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Line Performance <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              {formattedDate}
            </div>
          </div>
        </div>
      </CardFooter>
    </div>
  );
}
