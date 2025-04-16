"use client";
import React, { useState, useEffect } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { io } from "socket.io-client";
import {
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export default function LinePerformanceChart() {
  // State declarations
  const [error, setError] = useState("");
  const [lineData, setLineData] = useState<any>(null);
  const [selectedLine, setSelectedLine] = useState("");
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch production lines
  useEffect(() => {
    const fetchLines = async () => {
      try {
        setError("");
        console.log("Fetching production lines...");
        const res = await axios.get(`${API_URL}/api/lines`);
        console.log("Fetched lines:", res.data);
        setLines(res.data);
        if (res.data.length > 0) {
          setSelectedLine(res.data[0].id);
          setLineId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch lines:", err);
        setError(err.response?.data?.message || "Failed to fetch lines.");
      }
    };
    fetchLines();
  }, [API_URL]);

  // Fetch production line details
  useEffect(() => {
    if (!lineId) return;
    const fetchLineData = async () => {
      try {
        setError("");
        const res = await axios.get(`${API_URL}/api/lines/${lineId}/predict`);
        setLineData(res.data);
        console.log("Fetched line data:", res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch production line data.");
      }
    };
    fetchLineData();
  }, [API_URL, lineId]);

  // Set up socket connection for real-time updates
  useEffect(() => {
    if (!lineId) return;
    console.log("Connecting to socket...");
    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("lineOutputUpdated", (updatedLine) => {
      console.log("Received real-time update for line:", updatedLine);
      if (updatedLine._id === lineId) {
        setLineData(updatedLine);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
      console.log("Socket connection closed");
    };
  }, [API_URL, lineId]);

  // Updated Chart data
  const chartData = lineData?.efficiencyHistory?.map((point: any) => ({
    time: new Date(point.timestamp).getTime(),
    performance: point.efficiency,
  })) || [];

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
        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : chartData.length === 0 ? (
          <p className="text-center text-gray-500">No data available for the selected line.</p>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
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
          </ChartContainer>
        )}
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