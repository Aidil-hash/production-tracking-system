import React from 'react';
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from '../components/ui/card';
import LinePerformanceChartNoAccordion from '../components/ui/PerformanceDashboard';
import { Button } from "../components/ui/button";

export default function PerformanceDashboard() {
  return (
    <Card className="p-4 bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Button variant="contained" color="primary" size="small"
          className="hover:bg-gray-500 focus:bg-gray-500 cursor-pointer px-3 py-1">
            <Link to="/" className="text-black">
            Back to Login Screen
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <h2 className="text-lg font-semibold text-center mb-4 text-black">Line Performance</h2>
          <LinePerformanceChartNoAccordion />
        </div>
      </CardContent>
    </Card>
  );
}