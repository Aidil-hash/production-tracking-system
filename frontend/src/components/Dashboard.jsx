// src/components/Dashboard.js
import React from 'react';
import OperatorDashboard from './roleDashboards/OperatorDashboard';
import FGDashboard from './roleDashboards/FGDashboard';
import LeaderDashboard from './roleDashboards/LeaderDashboard';
import SupervisorDashboard from './roleDashboards/SupervisorDashboard';
import EngineerDashboard from './roleDashboards/EngineerDashboard';
import AdminDashboard from './roleDashboards/AdminDashboard';

function Dashboard() {
  // Retrieve role from localStorage (or from a global state/Redux/Context)
  const role = localStorage.getItem('role'); 

  if (!role) {
    return <p>No role found. Please log in.</p>;
  }

  switch (role) {
    case 'operator':
      return <OperatorDashboard />;
    case 'FG operator':
      return <FGDashboard />;
    case 'leader':
      return <LeaderDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'engineer':
      return <EngineerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <p>Unknown role. Please contact admin.</p>;
  }
}

export default Dashboard;
