// Minimal API stub to resolve Dashboard.jsx import and fix build errors

const BASE_URL = 'https://crypto-forex-backend.onrender.com';

export const userAPI = {
  register: async ({ username, email, password }) => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    return await res.json();
  },
  login: async ({ email, password }) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await res.json();
  },
  getProfile: async (token) => {
    const res = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },
  // Add updateProfile and other endpoints as needed
  requestPasswordReset: async (email) => {
    const res = await fetch(`${BASE_URL}/api/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.error || 'Failed to send reset link');
    }
    return await res.json();
  },

  // --- Trade and Balance Sync Endpoints ---
  getTrades: async (token) => {
    const res = await fetch(`${BASE_URL}/api/auth/user/trades`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch trades');
    return await res.json();
  },
  saveTrade: async (token, trade) => {
    const res = await fetch(`${BASE_URL}/api/auth/user/trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(trade)
    });
    if (!res.ok) throw new Error('Failed to save trade');
    return await res.json();
  },
  getBalance: async (token) => {
    const res = await fetch(`${BASE_URL}/api/auth/user/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch balance');
    return await res.json();
  },
  saveBalance: async (token, balance) => {
    const res = await fetch(`${BASE_URL}/api/auth/user/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ balance })
    });
    if (!res.ok) throw new Error('Failed to update balance');
    return await res.json();
  },
};

export const marketAPI = {
  getTickerData: async () => [
    { label: 'BTC/USDT', value: '$38,500', change: '+1.2%', color: '#4caf50' },
    { label: 'ETH/USDT', value: '$2,450', change: '-0.6%', color: '#f44336' },
    { label: 'BNB/USDT', value: '$310', change: '+0.4%', color: '#4caf50' },
    { label: 'SOL/USDT', value: '$105', change: '+2.1%', color: '#4caf50' },
    { label: 'XRP/USDT', value: '$0.62', change: '-0.3%', color: '#f44336' }
  ],
  getChartData: async () => [
    { time: '09:00', price: 38000 },
    { time: '10:00', price: 38120 },
    { time: '11:00', price: 37950 },
    { time: '12:00', price: 38200 },
    { time: '13:00', price: 38350 },
    { time: '14:00', price: 38420 },
    { time: '15:00', price: 38500 }
  ]
};
