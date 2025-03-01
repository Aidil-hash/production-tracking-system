// src/components/LogoutButton.js
import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove user authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('lineId'); // if used

    // Redirect to the login page ("/")
    navigate('/');
  };

  return (
    <Button variant="outlined" color="secondary" onClick={handleLogout}>
      Logout
    </Button>
  );
}

export default LogoutButton;
