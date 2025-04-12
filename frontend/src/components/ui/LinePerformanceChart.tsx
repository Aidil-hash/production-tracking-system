"use client";
import React, { useState, useEffect } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Area as RechartsArea } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export function LinePerformanceChart() {
  // State declarations
  const [error, setError] = useState("");
  const [lineData, setLineData] = useState<any>(null);
  const [lineId, setLineId] = useState(""); // Assuming lineId is set from props or context

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch production lines (if needed)
  const fetchLines = async () => {
    try {
      setError("");
      const res = await axios.get(`${API_URL}/api/lines`);
      setLineId(res.data.lines[0]._id); // Set the first line as default
    } catch (err) {
      console.error("Failed to fetch production lines:", err);
      setError("Failed to fetch production lines.");
    }
  };

  // Fetch line data initially
  const fetchLineData = async () => {
    if (!lineId) return;
    try {
      setError("");
      const res = await axios.get(`${API_URL}/api/lines/${lineId}/predict`);
      // Update state with the latest line data.
      setLineData(res.data.line);
    } catch (err) {
      console.error("Failed to fetch production line data:", err);
      setError("Failed to fetch production line data.");
    }
  };

  // Initial data fetches
  useEffect(() => {
    fetchLines();
  }, []);

  useEffect(() => {
    if (lineId) {
      fetchLineData();
    }
  }, [lineId]);

  // Set up socket connection for real-time updates
  useEffect(() => {
    if (!lineId) return;
    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    socket.on("lineOutputUpdated", (updatedLine) => {
      // Check if the update is for the current line
      if (updatedLine._id === lineId) {
        console.log("Received real-time update for line:", updatedLine);
        setLineData(updatedLine);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL, lineId]);

  // Prepare chart data from lineData
  // Assuming lineData contains historical logs in an array (if not, adjust accordingly)
  // For real-time updates, you might simply update a single value.
  const chartData = lineData
    ? [
        {
          time: new Date(lineData.startTime).getTime(), // Example: starting time
          performance: lineData.currentMaterialCount,    // Example: current output
        },
      ]
    : [];

  // Chart configuration
  const chartConfig = {
    performance: {
      label: "Performance",
      color: "hsl(var(--chart-1))",
      icon: Activity,
    },
  } satisfies ChartConfig;

  // Format current date
  const currentDate = new Date();
  const formattedDate = format(currentDate, "MMMM dd, yyyy");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Performance</CardTitle>
        <CardDescription>Performance metrics in real time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
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
              tickFormatter={value => value}
              domain={[0, 'auto']}
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
        </ChartContainer>
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
    </Card>
  );
}
