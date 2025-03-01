// src/App.js
import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import PrivateRoute from './components/PrivateRoute';


import { ThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from './theme';
import Button from '@mui/material/Button';

function App() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  return (
    <ThemeProvider theme={theme}>
      <Button variant="contained" onClick={toggleTheme}>
        Toggle Theme
      </Button>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }/>
          </Routes>
        </Router>
    </ThemeProvider>
  );
}

export default App;
