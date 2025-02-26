// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error] = useState('');
  const navigate = useNavigate(); // replaces useHistory

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // ... your axios login call
      const res = await axios.post(`${API_URL}/api/auth/login`, { name, password });
      const token = res.data.token;
      // Save the token (e.g., in localStorage)
      localStorage.setItem('token', token);
      // Optionally, save user details if provided
      localStorage.setItem('user', JSON.stringify(res.data.user || {}));
      // On success, navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      {error && <p style={{color:'red'}}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div>
          <label>Name:</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
