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
  const [error, setError] = useState("");
  const [linesData, setLinesData] = useState<any[]>([]);

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

  // Prepare chart data for multiple lines
  const chartData = linesData.map((line: any) => ({
    name: line.model,
    data: line.efficiencyData.map((point: any) => ({
      time: new Date(point.timestamp).getTime(),
      performance: point.efficiency,
    }))
  }));

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
          <ChartContainer config={{ performance: { label: "Performance", color: "hsl(var(--chart-1))", icon: Activity } }}>
            <AreaChart data={chartData[0]?.data} margin={{ left: 12, right: 12 }}>
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

              {chartData.map((lineData, index) => (
                <RechartsArea
                  key={index}
                  dataKey="performance"
                  type="step"
                  data={lineData.data}
                  fill={`hsl(${index * 60}, 100%, 60%)`} // Dynamic color for each line
                  fillOpacity={0.4}
                  stroke={`hsl(${index * 60}, 100%, 60%)`}
                />
              ))}
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
