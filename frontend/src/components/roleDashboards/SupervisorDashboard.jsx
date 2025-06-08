import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import { Card, CardHeader, CardContent } from "../ui/card"; // ShadCN Card
import LogoutButton from '../Logout';
import LineViewChart from '../ui/LineViewChart';

function SupervisorDashboard() {
  const [error, setError] = useState('');
  const [lines, setLines] = useState([]);
  const userName = localStorage.getItem('userName');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch list of all production lines
  useEffect(() => {
    const fetchLines = async () => {
      try {
        setError('');
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
      } catch (err) {
        console.error('Failed to fetch production lines:', err);
      }
    };

    fetchLines();
  }, [API_URL]);

  return (
    <Card className="p-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Welcome, {userName}</h1>
          <LogoutButton />
        </div>
      </CardHeader>

      <div className="w-full max-w-5xl mx-auto mt-8">
        <LineViewChart/>
      </div>

      <CardContent>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="mb-6 h-auto overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2 text-center mt-10">Production Line Details</h2>
            <Table className="table-auto w-[1000px] border mb-4 self-center mx-auto" aria-label="Production Lines">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] sticky top-0 bg-gray-900 z-10">Line</TableHead>
                  <TableHead className="w-[300px] sticky top-0 bg-gray-900 z-10">Model</TableHead>
                  <TableHead className="sticky top-0 bg-gray-900 z-10">Target Outputs</TableHead>
                  <TableHead className="sticky top-0 bg-gray-900 z-10">Total Outputs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    {line.modelRuns && line.modelRuns.length > 0 ? (
                      <ul className="list-disc ml-4">
                        {line.modelRuns.map(run => (
                          <li key={run.code} className="mb-2">
                            <b>{run.modelName}</b> <span className="text-xs text-gray-500">[{run.code}]</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <i>No model runs yet</i>
                    )}
                  </TableCell>
                  <TableCell>{line.targetOutputs}</TableCell>
                  <TableCell>{line.totalOutputs}</TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}

export default SupervisorDashboard;