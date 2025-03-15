// src/components/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  CssBaseline,
  AppBar,
  Toolbar,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import axios from 'axios';
import LogoutButton from '../Logout';

// Dummy components for each section
function UsersSection({ users, onEditUser, onDeleteUser }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Users</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user._id}>
                <TableCell>{user._id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell align="center">
                  <Button variant="contained" color="primary" size="small" onClick={() => onEditUser(user)}>
                    Edit
                  </Button>
                  <Button variant="contained" color="error" size="small" sx={{ ml: 1 }} onClick={() => onDeleteUser(user._id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function LinesSection({ lines, onDeleteLine }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Production Lines</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Current Material Count</TableCell>
              <TableCell>Total Outputs</TableCell>
              <TableCell>Leader</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map(line => (
              <TableRow key={line.id}>
                <TableCell>{line.id}</TableCell>
                <TableCell>{line.model}</TableCell>
                <TableCell>{line.currentMaterialCount}</TableCell>
                <TableCell>{line.totalOutputs}</TableCell>
                <TableCell>{line.leader ? line.leader.name : 'None'}</TableCell>
                <TableCell>{line.operator ? line.operator.name : 'None'}</TableCell>
                <TableCell align="center">
                  <Button variant="contained" color="error" size="small" onClick={() => onDeleteLine(line.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}


// Main AdminDashboard component
function AdminDashboard() {
  const [section, setSection] = useState('users'); // 'users', 'lines', 'scanlogs'
  const [users, setUsers] = useState([]);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Sidebar drawer width
  const drawerWidth = 240;

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    }
  }, [API_URL]);

  // Fetch Lines
  const fetchLines = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLines(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch production lines');
    }
  }, [API_URL]);


  useEffect(() => {
    fetchUsers();
    fetchLines();
  }, [fetchUsers, fetchLines]);

  // Handlers for delete/edit actions (dummy functions)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditUser = async (user) => {
    const newName = window.prompt('Enter new name:', user.name);
    const newEmail = window.prompt('Enter new email:', user.email);
    if (!newName || !newEmail) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/users/${user._id}`,
        { name: newName, email: newEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('User updated successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!window.confirm('Are you sure you want to delete this production line?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/lines/${lineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('Production line deleted successfully.');
      fetchLines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete production line');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Admin Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem button onClick={() => setSection('users')}>
              <ListItemText primary="Users" />
            </ListItem>
            <ListItem button onClick={() => setSection('lines')}>
              <ListItemText primary="Production Lines" />
            </ListItem>
          </List>
          <Divider />
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, mt: 8 }}
      >
        {error && (
          <Typography variant="body1" color="error" align="center" mb={2}>
            {error}
          </Typography>
        )}
        {message && (
          <Typography variant="body1" color="success.main" align="center" mb={2}>
            {message}
          </Typography>
        )}
        {section === 'users' && (
          <UsersSection users={users} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
        )}
        {section === 'lines' && (
          <LinesSection lines={lines} onDeleteLine={handleDeleteLine} />
        )}
      </Box>
    </Box>
  );
}

export default AdminDashboard;
