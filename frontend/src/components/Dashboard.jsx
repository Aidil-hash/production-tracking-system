// src/components/Dashboard.js
import React from 'react';
import OperatorDashboard from './roleDashboards/OperatorDashboard';
import FGDashboard from './roleDashboards/FGDashboard';
import PDQCDashboard from './roleDashboards/PDQCDashboard';
import LeaderDashboard from './roleDashboards/LeaderDashboard';
import TechnicianDashboard from './roleDashboards/TechnicianDashboards';
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
    case 'PDQC operator':
      return <PDQCDashboard />;
    case 'leader':
      return <LeaderDashboard />;
      case 'technician':
      return <TechnicianDashboard />;
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
