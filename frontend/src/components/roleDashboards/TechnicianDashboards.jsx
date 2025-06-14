import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import LogoutButton from '../Logout';
import { toast } from 'sonner';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TechnicianDashboard() {
  const [serial, setSerial] = useState('');
  const [serialDetail, setSerialDetail] = useState(null);
  const [reason, setReason] = useState('');
  const [repairs, setRepairs] = useState([]);
  const [technicianName, setTechnicianName] = useState(localStorage.getItem('userName') || '');

  // Search serial details
  const handleSearch = async () => {
    setSerialDetail(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/technician/serial/${serial}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSerialDetail(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Serial not found');
    }
  };

  // Record repair
  const handleRepair = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/technician/repair`, {
				model: serialDetail.model,
        serialNumber: serial,
        reason,
        technicianName,
      }, { headers: { Authorization: `Bearer ${token}` } });
			setReason('');
    	toast.success('Repair recorded successfully!');
      fetchRepairs();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record repair');
    }
  };

  // Fetch all repairs
  const fetchRepairs = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/technician/repairs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setRepairs(res.data);
  };

  // Export repairs (frontend only)
  const handleExport = () => {
    if (!repairs.length) return;
    const worksheetData = repairs.map(r => ({
      Serial: r.serialNumber,
      Reason: r.reason,
      Technician: r.technicianName,
      Date: new Date(r.repairedAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repairs");
    XLSX.writeFile(wb, "Repairs.xlsx");
  };

  // Delete scan record
  const handleDeleteScan = async () => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/api/technician/scan/${serial}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setSerialDetail(null);
    setSerial('');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
				<Typography variant="h5" gutterBottom>Technician Dashboard</Typography>
				<LogoutButton />
			</div>
			
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Serial Number"
          value={serial}
          onChange={e => setSerial(e.target.value)}
					sx={{
						minWidth: 500,
            '& label': { color: '#ffffff' },
            '& .MuiOutlinedInput-root': {
            	'& fieldset': { borderColor: '#ffffff' },
              '&:hover fieldset': { borderColor: '#1565c0' },
              '&.Mui-focused fieldset': { borderColor: '#0d47a1' }
              },
						'& backgroundColor': '#333333',
            '& input': { color: '#ffffff' }
            }}
        />
        <Button variant="contained" onClick={handleSearch}>Search</Button>
      </Box>

      {serialDetail && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography><strong>Line:</strong> {serialDetail.line}</Typography>
          <Typography><strong>Model:</strong> {serialDetail.model}</Typography>
          <Typography>
						<strong>First Status:</strong>
						<Box
							component="span"
							sx={{
								ml: 1,
								px: 1.5,
								py: 0.5,
								borderRadius: 1,
								color: '#fff',
								bgcolor:
									serialDetail.firstStatus === 'PASS'
										? 'success.main'
										: serialDetail.firstStatus === 'NG'
										? 'error.main'
										: 'grey.700',
								display: 'inline-block',
								fontWeight: 600,
								letterSpacing: 1,
							}}
						>
							{serialDetail.firstStatus}
						</Box>
					</Typography>
          <Typography><strong>First Operator:</strong> {serialDetail.firstOperator}</Typography>
          <Typography><strong>First Scan Time:</strong> {serialDetail.firstScanTime && new Date(serialDetail.firstScanTime).toLocaleString()}</Typography>
          <Typography>
						<strong>Second Status:</strong>
						<Box
							component="span"
							sx={{
								ml: 1,
								px: 1.5,
								py: 0.5,
								borderRadius: 1,
								color: '#fff',
								bgcolor:
									serialDetail.verificationStage >= 2
										? serialDetail.secondStatus === 'PASS'
											? 'success.main'
											: serialDetail.secondStatus === 'NG'
											? 'error.main'
											: 'grey.700'
										: 'grey.700',
								display: 'inline-block',
								fontWeight: 600,
								letterSpacing: 1,
							}}
						>
							{serialDetail.verificationStage >= 2 ? serialDetail.secondStatus : '-'}
						</Box>
					</Typography>
          <Typography><strong>Second Verifier:</strong> {serialDetail.secondVerifier}</Typography>
          <Typography><strong>Second Scan Time:</strong> {serialDetail.verificationStage >= 2 && serialDetail.secondScanTime && new Date(serialDetail.secondScanTime).toLocaleString()}</Typography>
        </Paper>
      )}

      {/* Reject/Repair input */}
      {serialDetail && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Reject Reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
						sx={{
							minWidth: 300,
							'& label': { color: '#ffffff' },
							'& .MuiOutlinedInput-root': {
								'& fieldset': { borderColor: '#ffffff' },
								'&:hover fieldset': { borderColor: '#1565c0' },
								'&.Mui-focused fieldset': { borderColor: '#0d47a1' }
								},
							'& backgroundColor': '#333333',
							'& input': { color: '#ffffff' }
							}}
          />
          <Button variant="contained" onClick={handleRepair}>Record Repair</Button>
          <Button variant="outlined" color="error" onClick={handleDeleteScan}>Delete from Scan Records</Button>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={fetchRepairs}>Show Repairs</Button>
        <Button variant="outlined" sx={{ ml: 2 }} onClick={handleExport}>Export to Excel</Button>
        {repairs.length > 0 && (
          <Table size="small" sx={{ mt: 2, color: 'white', border: '1px solid #444' }}>
						<TableHead>
							<TableRow sx={{ backgroundColor: '#1b2230' }}>
								<TableCell sx={{ color: 'white' }}>Model</TableCell>
								<TableCell sx={{ color: 'white' }}>Serial</TableCell>
								<TableCell sx={{ color: 'white' }}>Reason</TableCell>
								<TableCell sx={{ color: 'white' }}>Technician</TableCell>
								<TableCell sx={{ color: 'white' }}>Repaired At</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{repairs.map((r, i) => (
								<TableRow key={i} sx={{ backgroundColor: '#232326' }}>
									<TableCell sx={{ color: 'white' }}>{r.model}</TableCell>
									<TableCell sx={{ color: 'white' }}>{r.serialNumber}</TableCell>
									<TableCell sx={{ color: 'white' }}>{r.reason}</TableCell>
									<TableCell sx={{ color: 'white' }}>{r.technicianName}</TableCell>
									<TableCell sx={{ color: 'white' }}>{new Date(r.repairedAt).toLocaleString()}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
        )}
      </Box>
    </Box>
  );
}

export default TechnicianDashboard;
