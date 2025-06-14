// src/App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import PerformanceDashboard from './components/PerformanceDashboard';
import PrivateRoute from './components/PrivateRoute';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/performance" element={<PerformanceDashboard />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white font-sans antialiased">
      <Router>
        <Toaster
          position="top-center"
          duration={3000}
          richColors
          container={() => document.getElementById('toast-root')}
          toastOptions={{
            render: {
              success: (t) => ({
                ...t,
                icon: <CheckCircle className="text-white" />,
              }),
              error: (t) => ({
                ...t,
                icon: <XCircle className="text-white" />,
              }),
              warning: (t) => ({
                ...t,
                icon: <AlertTriangle className="text-black" />,
              }),
              info: (t) => ({
                ...t,
                icon: <Info className="text-white" />,
              }),
            },
          }}
        />
        <AnimatedRoutes />
      </Router>
    </div>
  );
}
