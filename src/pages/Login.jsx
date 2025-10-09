
import React, { useState } from 'react';
import { Box, Card, Typography, TextField, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

import { userAPI } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (email.trim() && password.trim()) {
      setLoading(true);
      try {
        const response = await userAPI.login({ email, password });
        if (response.token && response.user) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          navigate('/dashboard');
        } else {
          setError(response.error || 'Login failed');
        }
      } catch (err) {
        setError('Login failed');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please fill in all fields');
    }
  };
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#181A20">
      <Box sx={{ position: 'absolute', top: 32, left: 0, right: 0, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={900} color="primary" sx={{ letterSpacing: 1, mb: 4 }}>
          Elon Investment Broker
        </Typography>
      </Box>
      <Card sx={{ p: 4, borderRadius: 3, boxShadow: 3, minWidth: 320, maxWidth: 400, width: '100%' }}>
        <form onSubmit={handleLogin}>
          <Typography variant="h5" fontWeight={900} color="primary" sx={{ mb: 2 }}>
            Login
          </Typography>
        <TextField
          label="Email"
          type="email"
          fullWidth
          sx={{ mb: 2 }}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          sx={{ mb: 2 }}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
          <Button variant="contained" color="primary" fullWidth size="large" type="submit" sx={{ fontWeight: 700 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          {error && (
            <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>
          )}
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 700 }}>
              Register
            </Link>
          </Typography>
        </form>
      </Card>
    </Box>
  );
}
