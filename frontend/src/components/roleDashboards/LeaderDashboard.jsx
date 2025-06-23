import React, { useEffect, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import LogoutButton from '../Logout';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile'; // <-- import the hook

const defaultSlots = [
  "8.00 - 9.00", "9.00 - 10.00", "10.15 - 11.30", "12.10 - 1.00", "1.00 - 2.00", "2.00 - 3.00", "3.15 - 4.00", "4.00 - 5.00", "5.00 - 5.30",
  "5.45 - 6.45", "6.45 - 7.45"
];

const fridaySlot = ["8.00 - 9.00", "9.00 - 10.00", "10.15 - 11.00", "11.00 - 12.00", "12.00 - 1.00", "2.30 - 3.00", "3.00 - 4.00", "4.00 - 5.00",
  "5.00 - 5.30", "5.45 - 6.45", "6.45 - 7.45"
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function LeaderDashboard() {
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [latestModel, setLatestModel] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const initialSlots = useMemo(() => {
    const selectedDate = new Date(date);
    const isFriday = selectedDate.getDay() === 5;
    return isFriday ? fridaySlot : defaultSlots;
  }, [date]);

  const [rows, setRows] = useState(
    initialSlots.map(time => ({ time, target: '', actual: '' }))
  );

  const userName = localStorage.getItem('userName');
  const selectedLineIdRef = useRef(selectedLineId);
  const dateRef = useRef(date);
  const isMobile = useIsMobile(); // <-- use the hook

  useEffect(() => {
    selectedLineIdRef.current = selectedLineId;
  }, [selectedLineId]);

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });

    const handleScanEvent = async () => {
      const currentLineId = selectedLineIdRef.current;
      const currentDate = dateRef.current;
      if (!currentLineId || !currentDate) return;
      try {
        const token = localStorage.getItem('token');
        let targets = initialSlots.map(time => ({ time, target: '', actual: '' }));
        try {
          const targetsRes = await axios.get(`${API_URL}/api/leader/get-hourly-targets`, {
            params: { lineId: currentLineId, date: currentDate },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (targetsRes.data && Array.isArray(targetsRes.data.slots)) {
            targets = initialSlots.map(slot => {
              const found = targetsRes.data.slots.find(s => s.time === slot);
              return found ? found : { time: slot, target: '', actual: '' };
            });
          }
        } catch {}
        try {
          const actualsRes = await axios.get(`${API_URL}/api/leader/get-actuals`, {
            params: { lineId: currentLineId, date: currentDate },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (Array.isArray(actualsRes.data)) {
            targets = targets.map(row => {
              const found = actualsRes.data.find(slot => slot.time === row.time);
              return found ? { ...row, actual: found.actual } : row;
            });
          }
        } catch {}
        try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lineList = res.data;
        setLines(lineList);

        if (lineList.length) {
          const defaultLine = lineList[0];
          setSelectedLineId(defaultLine._id || defaultLine.id);

          // Set latest model run if available
          if (defaultLine.modelRuns && defaultLine.modelRuns.length > 0) {
            const latest = defaultLine.modelRuns.reduce((a, b) =>
              new Date(a.lastSeen) > new Date(b.lastSeen) ? a : b
            );
            setLatestModel(latest);
          }
        }
        } catch {}
        setRows(targets);
      } catch (err) {
        setRows(initialSlots.map(time => ({ time, target: '', actual: '' })));
      }
    };

    socket.on('newScan', handleScanEvent);
    socket.on('newScanBatch', handleScanEvent);
    return () => socket.disconnect();
  }, [initialSlots]);

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lineList = res.data;
        setLines(lineList);

        if (lineList.length) {
          const defaultLine = lineList[0];
          setSelectedLineId(defaultLine._id || defaultLine.id);

          // Set latest model run if available
          if (defaultLine.modelRuns && defaultLine.modelRuns.length > 0) {
            const latest = defaultLine.modelRuns.reduce((a, b) =>
              new Date(a.lastSeen) > new Date(b.lastSeen) ? a : b
            );
            setLatestModel(latest);
          }
        }
      } catch (err) {
        toast.error('Failed to fetch production lines');
      }
    };
    fetchLines();
  }, []);

  useEffect(() => {
    const selectedLine = lines.find(line => (line._id || line.id) === selectedLineId);
    if (selectedLine && selectedLine.modelRuns?.length > 0) {
      const latest = selectedLine.modelRuns.reduce((a, b) =>
        new Date(a.lastSeen) > new Date(b.lastSeen) ? a : b
      );
      setLatestModel(latest);
    } else {
      setLatestModel(null);
    }
  }, [selectedLineId, lines]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedLineId || !date) return;
      try {
        const token = localStorage.getItem('token');
        let targets = initialSlots.map(time => ({ time, target: '', actual: '' }));
        try {
          const targetsRes = await axios.get(`${API_URL}/api/leader/get-hourly-targets`, {
            params: { lineId: selectedLineId, date },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (targetsRes.data && Array.isArray(targetsRes.data.slots)) {
            targets = initialSlots.map(slot => {
              const found = targetsRes.data.slots.find(s => s.time === slot);
              return found ? found : { time: slot, target: '', actual: '' };
            });
          }
        } catch {}

        try {
          const actualsRes = await axios.get(`${API_URL}/api/leader/get-actuals`, {
            params: { lineId: selectedLineId, date },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (Array.isArray(actualsRes.data)) {
            targets = targets.map(row => {
              const found = actualsRes.data.find(slot => slot.time === row.time);
              return found ? { ...row, actual: found.actual } : row;
            });
          }
        } catch {}
        setRows(targets);
      } catch {
        setRows(initialSlots.map(time => ({ time, target: '', actual: '' })));
      }
    };
    fetchAll();
  }, [selectedLineId, date, initialSlots]);

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLines(res.data);
        if (res.data.length) setSelectedLineId(res.data[0]._id || res.data[0].id);
      } catch (err) {
        toast.error('Failed to fetch production lines');
      }
    };
    fetchLines();
  }, []);

  const handleInput = (idx, field, value) => {
    setRows(rows =>
      rows.map((row, i) =>
        i === idx ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/leader/set-hourly-targets`,
        {
          lineId: selectedLineId,
          date,
          slots: rows,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(response.data.message + ` Total Day Target: ${response.data.totalTarget}`);
    } catch (error) {
      toast.error('Error saving hourly targets');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
      </div>
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold mb-1">Select Production Line:</label>
          <select
            value={selectedLineId}
            onChange={e => setSelectedLineId(e.target.value)}
            className="p-2 border rounded w-56 text-white bg-gray-800"
          >
            {lines.map(line => (
              <option key={line._id || line.id} value={line._id || line.id}>
                {line.name} ({line.department})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 ">Date:</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="p-2 border rounded text-white bg-gray-800"
          />
        </div>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded h-10"
        >
          Save Targets
        </button>
        <LogoutButton />
      </div>
      <div className="mb-4">
        {latestModel && (
          <p className="text-sm text-gray-300">
            Latest Model: <strong>{latestModel.modelName}</strong> ({latestModel.code})
          </p>
        )}
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {isMobile ? (
          <div>
            {rows.map((row, idx) => {
              const accumTarget = rows.slice(0, idx + 1).reduce((sum, r) => sum + Number(r.target || 0), 0);
              const accumActual = rows.slice(0, idx + 1).reduce((sum, r) => sum + Number(r.actual || 0), 0);
              return (
                <div key={row.time} className="mb-3 p-3 border rounded bg-gray-800 text-white">
                  <div className="flex justify-between">
                    <span className="font-semibold">Time:</span>
                    <span>{row.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-semibold">Target:</span>
                    <input
                      type="number"
                      value={row.target}
                      onChange={e => handleInput(idx, 'target', e.target.value)}
                      className="border p-1 w-20 text-white bg-gray-700 ml-2"
                      min="0"
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Accum Target:</span>
                    <span>{accumTarget}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Actual:</span>
                    <span>{row.actual !== '' ? row.actual : 0}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Accum Actual:</span>
                    <span>{accumActual}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">+/- :</span>
                    <span>{Number(row.actual || 0) - Number(row.target || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="table-auto w-full border mb-4 text-white bg-gray-800">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-900 z-10">TIME</th>
                <th className="sticky top-0 bg-gray-900 z-10">TARGET</th>
                <th className="sticky top-0 bg-gray-900 z-10">ACCUM TARGET</th>
                <th className="sticky top-0 bg-gray-900 z-10">ACTUAL</th>
                <th className="sticky top-0 bg-gray-900 z-10">ACCUM ACTUAL</th>
                <th className="sticky top-0 bg-gray-900 z-10">+/ -</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const accumTarget = rows.slice(0, idx + 1).reduce((sum, r) => sum + Number(r.target || 0), 0);
                const accumActual = rows.slice(0, idx + 1).reduce((sum, r) => sum + Number(r.actual || 0), 0);
                return (
                  <tr key={row.time}>
                    <td className="border px-2 py-1 text-white bg-gray-800">{row.time}</td>
                    <td className="border px-2 py-1 text-white bg-gray-800">
                      <input
                        type="number"
                        value={row.target}
                        onChange={e => handleInput(idx, 'target', e.target.value)}
                        className="border p-1 w-20 text-white bg-gray-800"
                        min="0"
                      />
                    </td>
                    <td className="border px-2 py-1 text-white bg-gray-800">{accumTarget}</td>
                    <td className="border px-2 py-1 text-white bg-gray-800">
                      {row.actual !== '' ? row.actual : 0}
                    </td>
                    <td className="border px-2 py-1 text-white bg-gray-800">{accumActual}</td>
                    <td className="border px-2 py-1 text-center text-white bg-gray-800">
                      {Number(row.actual || 0) - Number(row.target || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}