import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { Plan, Signal } from '../models/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    // Check for existing user by email
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    // Check for existing user by username
    const existingUserByUsername = await User.findOne({ where: { name: username } });
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: username,
      email,
      password: passwordHash
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.name,
        email: user.email
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Check server logs for details.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.name,
        email: user.email
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});


// Admin Login (super admin only)
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  try {
    // Only allow super admin
    if (email !== 'admin@elonbroker.com') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const admin = await User.findOne({ where: { email } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.name,
        email: admin.email
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Admin login failed.' });
  }
});

// Change admin password
router.put('/admin/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    // Only allow super admin
    if (email !== 'admin@elonbroker.com') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const admin = await User.findOne({ where: { email } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Old password incorrect.' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    admin.password = newHash;
    await admin.save();
    res.json({ success: true, message: 'Password updated.' });
  } catch (err) {
    console.error('Admin password change error:', err);
    res.status(500).json({ error: 'Password update failed.' });
  }
});

export default router;
// Admin: Get all KYC requests (pending)
router.get('/admin/kyc', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing.' });
    const adminToken = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    // Aggregate KYC activities (so admins see the submitted kycData and file URLs)
    const users = await User.findAll();
    let kycRequests = [];
    users.forEach(user => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      activities.forEach(activity => {
        if (activity.type === 'kyc') {
          kycRequests.push({
            activityId: activity.id,
            userId: user.id,
            username: user.name,
            email: user.email,
            kycStatus: user.kycStatus,
            createdAt: activity.date || user.createdAt,
            kycData: activity.kycData || activity.data || {}
          });
        }
      });
    });
    res.json(kycRequests);
  } catch (err) {
    console.error('Admin get KYC error:', err);
    res.status(500).json({ error: 'Failed to fetch KYC requests.' });
  }
});
// Admin: Get all deposit requests (aggregated from all users)
router.get('/admin/deposits', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing.' });
    const adminToken = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    // Aggregate all deposit activities from all users
    const users = await User.findAll();
    let deposits = [];
    users.forEach(user => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      activities.forEach(activity => {
        if (activity.type === 'deposit') {
          deposits.push({
            ...activity,
            userId: user.id,
            username: user.name,
            email: user.email
          });
        }
      });
    });
    // Return the array directly
    res.json(deposits);
  } catch (err) {
    console.error('Admin get deposits error:', err);
    res.status(500).json({ error: 'Failed to fetch deposits.' });
  }
});

// Admin: Get all withdrawal requests (aggregated from all users)
router.get('/admin/withdrawals', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing.' });
    const adminToken = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    // Aggregate all withdrawal activities from all users
    const users = await User.findAll();
    let withdrawals = [];
    users.forEach(user => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      activities.forEach(activity => {
        if (activity.type === 'withdrawal') {
          withdrawals.push({
            ...activity,
            userId: user.id,
            username: user.name,
            email: user.email
          });
        }
      });
    });
    // Return the array directly
    res.json(withdrawals);
  } catch (err) {
    console.error('Admin get withdrawals error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawals.' });
  }
});

// Admin: Get all plans
router.get('/admin/plans', requireAdmin, async (req, res) => {
  try {
    const plans = await Plan.findAll();
    res.json(plans);
  } catch (err) {
    console.error('Admin get plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// Admin: Get all signals
router.get('/admin/signals', requireAdmin, async (req, res) => {
  try {
    const signals = await Signal.findAll();
    res.json(signals);
  } catch (err) {
    console.error('Admin get signals error:', err);
    res.status(500).json({ error: 'Failed to fetch signals.' });
  }
});

// Admin: Get all users (basic info)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    const basic = users.map(u => ({ id: u.id, username: u.name, email: u.email, createdAt: u.createdAt }));
    res.json(basic);
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Approve KYC
router.post('/admin/kyc/:activityId/approve', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'kyc');
      if (idx !== -1) {
        user.kycStatus = 'verified';
        activities[idx].status = 'verified';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id });
      }
    }
    res.status(404).json({ error: 'KYC activity not found.' });
  } catch (err) {
    console.error('Approve KYC error:', err);
    res.status(500).json({ error: 'Failed to approve KYC.' });
  }
});

// Reject KYC
router.post('/admin/kyc/:activityId/reject', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'kyc');
      if (idx !== -1) {
        user.kycStatus = 'rejected';
        activities[idx].status = 'rejected';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id });
      }
    }
    res.status(404).json({ error: 'KYC activity not found.' });
  } catch (err) {
    console.error('Reject KYC error:', err);
    res.status(500).json({ error: 'Failed to reject KYC.' });
  }
});

// Admin: Approve KYC by userId (fallback when activityId isn't present)
router.post('/admin/kyc/user/:userId/approve', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    // find latest kyc activity
    const idx = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'kyc');
    if (!idx) return res.status(404).json({ error: 'No KYC activity found for user.' });
    const activityIndex = idx.i;
    user.kycStatus = 'verified';
    activities[activityIndex].status = 'verified';
    user.activities = activities;
    await user.save();
    return res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('Approve KYC by user error:', err);
    res.status(500).json({ error: 'Failed to approve KYC.' });
  }
});

// Admin: Reject KYC by userId (fallback when activityId isn't present)
router.post('/admin/kyc/user/:userId/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    const idx = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'kyc');
    if (!idx) return res.status(404).json({ error: 'No KYC activity found for user.' });
    const activityIndex = idx.i;
    user.kycStatus = 'rejected';
    activities[activityIndex].status = 'rejected';
    user.activities = activities;
    await user.save();
    return res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('Reject KYC by user error:', err);
    res.status(500).json({ error: 'Failed to reject KYC.' });
  }
});

// Approve Deposit
router.post('/admin/deposits/:activityId/approve', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    // Optional amount override can be provided in request body: { amount: 100 }
    const overrideAmount = req.body && typeof req.body.amount !== 'undefined' ? Number(req.body.amount) : null;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'deposit');
      if (idx !== -1) {
        // credit balance and mark activity approved
        const amt = overrideAmount !== null ? overrideAmount : Number(activities[idx].amount || 0);
        user.balance = Number(user.balance) + amt;
        activities[idx].status = 'approved';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id, balance: user.balance });
      }
    }
    res.status(404).json({ error: 'Deposit activity not found.' });
  } catch (err) {
    console.error('Approve deposit error:', err);
    res.status(500).json({ error: 'Failed to approve deposit.' });
  }
});

// Approve Withdrawal
router.post('/admin/withdrawals/:activityId/approve', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'withdrawal');
      if (idx !== -1) {
        const amt = Number(activities[idx].amount || 0);
        if (Number(user.balance) < amt) return res.status(400).json({ error: 'Insufficient balance.' });
        user.balance = Number(user.balance) - amt;
        activities[idx].status = 'approved';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id, balance: user.balance });
      }
    }
    res.status(404).json({ error: 'Withdrawal activity not found.' });
  } catch (err) {
    console.error('Approve withdrawal error:', err);
    res.status(500).json({ error: 'Failed to approve withdrawal.' });
  }
});

// Reject Deposit
router.post('/admin/deposits/:activityId/reject', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'deposit');
      if (idx !== -1) {
        activities[idx].status = 'rejected';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id });
      }
    }
    res.status(404).json({ error: 'Deposit activity not found.' });
  } catch (err) {
    console.error('Reject deposit error:', err);
    res.status(500).json({ error: 'Failed to reject deposit.' });
  }
});

// Admin: Approve Deposit by userId (fallback when activityId isn't present)
router.post('/admin/deposits/user/:userId/approve', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const overrideAmount = req.body && typeof req.body.amount !== 'undefined' ? Number(req.body.amount) : null;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    // find latest deposit activity
    const found = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'deposit');
    if (!found) return res.status(404).json({ error: 'No deposit activity found for user.' });
    const idx = found.i;
    const amt = overrideAmount !== null ? overrideAmount : Number(activities[idx].amount || 0);
    user.balance = Number(user.balance) + amt;
    activities[idx].status = 'approved';
    user.activities = activities;
    await user.save();
    return res.json({ success: true, userId: user.id, balance: user.balance });
  } catch (err) {
    console.error('Approve deposit by user error:', err);
    res.status(500).json({ error: 'Failed to approve deposit.' });
  }
});

// Admin: Reject Deposit by userId (fallback when activityId isn't present)
router.post('/admin/deposits/user/:userId/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    const found = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'deposit');
    if (!found) return res.status(404).json({ error: 'No deposit activity found for user.' });
    const idx = found.i;
    activities[idx].status = 'rejected';
    user.activities = activities;
    await user.save();
    return res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('Reject deposit by user error:', err);
    res.status(500).json({ error: 'Failed to reject deposit.' });
  }
});

// Reject Withdrawal
router.post('/admin/withdrawals/:activityId/reject', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      const idx = activities.findIndex(a => a.id === activityId && a.type === 'withdrawal');
      if (idx !== -1) {
        activities[idx].status = 'rejected';
        user.activities = activities;
        await user.save();
        return res.json({ success: true, userId: user.id });
      }
    }
    res.status(404).json({ error: 'Withdrawal activity not found.' });
  } catch (err) {
    console.error('Reject withdrawal error:', err);
    res.status(500).json({ error: 'Failed to reject withdrawal.' });
  }
});
