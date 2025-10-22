
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Plan, Signal, Activity } from '../models/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from '../utils/mailer.js';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Approve deposit and credit user balance (admin only)
router.post('/admin/deposits/:id/approve', requireAdmin, async (req, res) => {
  const depositId = req.params.id;
  try {
    // Find deposit activity by ID and type
    const deposit = await Activity.findOne({ where: { id: depositId, type: 'deposit' } });
    if (!deposit) return res.status(404).json({ error: 'Deposit activity not found.' });

    // Mark deposit as approved
    deposit.status = 'approved';
    await deposit.save();

    // Credit user balance
    const user = await User.findByPk(deposit.userId);
    if (user) {
      user.balance += deposit.amount || 0;
      await user.save();
      console.log(`Admin approved deposit ${depositId} for user ${user.id}. New balance: ${user.balance}`);
    }

    res.json({ success: true, message: 'Deposit approved and user credited.' });
  } catch (err) {
    console.error('Approve deposit error:', err);
    res.status(500).json({ error: 'Server error approving deposit.' });
  }
});

// Request password reset: generates token and sends email
router.post('/password-reset/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    const user = await User.findOne({ where: { email } });
    // Do not reveal whether a user exists in production. We'll still log or return
    // a usable resetLink for non-production testing environments.
    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        // Generic success response to avoid user enumeration.
        return res.json({ success: true, message: 'If an account exists, a password reset link has been sent.' });
      }
      return res.status(404).json({ error: 'User not found.' });
    }
    // Generate a secure, time-limited token
    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    // Construct reset link (adjust frontend URL as needed)
    const resetLink = `${process.env.FRONTEND_URL || 'https://crypto-forex-three.vercel.app'}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, resetLink);
    // In non-production, include the link in the JSON so testers can copy it directly.
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ success: true, message: 'Password reset link sent.', resetLink });
    }
    return res.json({ success: true, message: 'If an account exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Failed to send password reset email.' });
  }
});

// Reset password using token
router.post('/password-reset/confirm', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Token and valid new password required.' });
  }
  try {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = passwordHash;
    await user.save();
    return res.json({ success: true, message: 'Password updated.' });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

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
    if (err && err.stack) console.error(err.stack);
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

// Admin: Reset user password (set temporary password)
router.post('/admin/users/:userId/reset-password', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A valid new password is required (min 6 chars).' });
    }
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = passwordHash;
    await user.save();
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// --- Trade and Balance Sync Endpoints ---
import { Op } from 'sequelize';

// Middleware to require user authentication
function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// GET user trades
router.get('/user/trades', requireUser, async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: {
        userId: req.userId,
        type: { [Op.in]: ['trade', 'deposit', 'withdrawal'] }
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(activities);
  } catch (err) {
    console.error('Get user trades error:', err);
    res.status(500).json({ error: 'Failed to fetch trades.' });
  }
});

// POST new trade
router.post('/user/trades', requireUser, async (req, res) => {
  try {
    const { type, amount, meta } = req.body;
    if (!type || !['trade', 'deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ error: 'Invalid trade type.' });
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    const activity = await Activity.create({
      userId: req.userId,
      type,
      amount,
      status: 'completed',
      meta: meta || {},
      createdAt: new Date()
    });
    // Optionally update user balance for deposit/withdrawal
    if (type === 'deposit' || type === 'withdrawal') {
      const user = await User.findByPk(req.userId);
      if (user) {
        let newBalance = user.balance;
        if (type === 'deposit') newBalance += amount;
        if (type === 'withdrawal') newBalance -= amount;
        user.balance = Math.max(0, newBalance);
        await user.save();
      }
    }
    res.json(activity);
  } catch (err) {
    console.error('Create trade error:', err);
    res.status(500).json({ error: 'Failed to create trade.' });
  }
});

// GET user balance
router.get('/user/balance', requireUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    console.log('GET /user/balance request for userId=', req.userId, 'found user=', !!user);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    console.log('Returning balance for user', user.id, user.balance);
    res.json({ balance: user.balance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'Failed to fetch balance.' });
  }
});

// POST update user balance
router.post('/user/balance', requireUser, async (req, res) => {
  try {
    const { balance } = req.body;
    console.log('POST /user/balance request for userId=', req.userId, 'payload balance=', balance);
    if (typeof balance !== 'number' || isNaN(balance)) {
      return res.status(400).json({ error: 'Invalid balance.' });
    }
    const user = await User.findByPk(req.userId);
    console.log('Found user for update:', !!user, 'userId=', req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.balance = Math.max(0, balance);
    await user.save();
    console.log('Updated balance for user', user.id, 'to', user.balance);
    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error('Update balance error:', err);
    res.status(500).json({ error: 'Failed to update balance.' });
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
    // Aggregate KYC activities (only include pending/unhandled requests)
    const users = await User.findAll();
    let kycRequests = [];
    users.forEach(user => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      activities.forEach(activity => {
        // treat missing status as 'pending'
        const status = typeof activity.status === 'undefined' ? 'pending' : activity.status;
        if (activity.type === 'kyc' && status === 'pending') {
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
    // Get all pending deposits from Activity table
    const pendingDeposits = await Activity.findAll({ where: { type: 'deposit', status: 'pending' } });
    // Attach user info to each deposit
    const userIds = pendingDeposits.map(d => d.userId);
    const users = await User.findAll({ where: { id: userIds } });
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const depositsWithUser = pendingDeposits.map(deposit => ({
      ...deposit.dataValues,
      username: userMap[deposit.userId]?.name || '',
      email: userMap[deposit.userId]?.email || '',
      proofUrl: deposit.dataValues.meta?.proof || null
    }));
    res.json(depositsWithUser);
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
    // Aggregate all withdrawal activities from all users (only pending)
    const users = await User.findAll();
    let withdrawals = [];
    users.forEach(user => {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      activities.forEach(activity => {
        const status = typeof activity.status === 'undefined' ? 'pending' : activity.status;
        if (activity.type === 'withdrawal' && status === 'pending') {
          withdrawals.push({
            ...activity,
            userId: user.id,
            username: user.name,
            email: user.email,
            amount: activity.amount || null,
            method: activity.method || activity.meta?.method || null,
            bankName: activity.bankName || activity.meta?.bankName || null,
            accountName: activity.accountName || activity.meta?.accountName || null,
            accountNumber: activity.accountNumber || activity.meta?.accountNumber || null,
            walletAddress: activity.walletAddress || activity.meta?.walletAddress || null
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

// Admin: Get activities for a specific user (debug / verification)
router.get('/admin/users/:userId/activities', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    return res.json({ userId: user.id, activities });
  } catch (err) {
    console.error('Admin get user activities error:', err);
    res.status(500).json({ error: 'Failed to fetch user activities.' });
  }
});

// Admin: Create a new plan
router.post('/admin/plans', requireAdmin, async (req, res) => {
  try {
    const { name, type, roi, minAmount, maxAmount, duration, color, gradient, features } = req.body || {};
    if (!name || !type || !roi) return res.status(400).json({ error: 'name, type and roi are required.' });
    const plan = await Plan.create({
      name,
      type,
      roi: String(roi),
      minAmount: Number(minAmount) || 0,
      maxAmount: Number(maxAmount) || 0,
      duration: duration || '',
      color: color || '#000',
      gradient: gradient || '',
      features: Array.isArray(features) ? features : (features ? String(features).split('\n').map(s => s.trim()).filter(Boolean) : [])
    });
    res.status(201).json(plan);
  } catch (err) {
    console.error('Admin create plan error:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
});

// Admin: Update an existing plan
router.put('/admin/plans/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });
    const { name, type, roi, minAmount, maxAmount, duration, color, gradient, features } = req.body || {};
    plan.name = name ?? plan.name;
    plan.type = type ?? plan.type;
    plan.roi = roi !== undefined ? String(roi) : plan.roi;
    plan.minAmount = minAmount !== undefined ? Number(minAmount) : plan.minAmount;
    plan.maxAmount = maxAmount !== undefined ? Number(maxAmount) : plan.maxAmount;
    plan.duration = duration ?? plan.duration;
    plan.color = color ?? plan.color;
    plan.gradient = gradient ?? plan.gradient;
    plan.features = Array.isArray(features) ? features : (features ? String(features).split('\n').map(s => s.trim()).filter(Boolean) : plan.features);
    await plan.save();
    res.json(plan);
  } catch (err) {
    console.error('Admin update plan error:', err);
    res.status(500).json({ error: 'Failed to update plan.' });
  }
});

// Admin: Delete a plan
router.delete('/admin/plans/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });
    await plan.destroy();
    res.json({ success: true, id });
  } catch (err) {
    console.error('Admin delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete plan.' });
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

// Admin: Create a new signal
router.post('/admin/signals', requireAdmin, async (req, res) => {
  try {
    const { name, price, description, features, accuracy, subscribers, badge, badgeColor, color } = req.body || {};
    if (!name || !price || !description) return res.status(400).json({ error: 'name, price and description are required.' });
    const signal = await Signal.create({
      name,
      price: Number(price),
      description,
      features: Array.isArray(features) ? features : (features ? String(features).split('\n').map(s => s.trim()).filter(Boolean) : []),
      accuracy: accuracy || '',
      subscribers: subscribers || '0',
      badge: badge || '',
      badgeColor: badgeColor || '',
      color: color || '#000'
    });
    res.status(201).json(signal);
  } catch (err) {
    console.error('Admin create signal error:', err);
    res.status(500).json({ error: 'Failed to create signal.' });
  }
});

// Admin: Update an existing signal
router.put('/admin/signals/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const signal = await Signal.findByPk(id);
    if (!signal) return res.status(404).json({ error: 'Signal not found.' });
    const { name, price, description, features, accuracy, subscribers, badge, badgeColor, color } = req.body || {};
    signal.name = name ?? signal.name;
    signal.price = price !== undefined ? Number(price) : signal.price;
    signal.description = description ?? signal.description;
    signal.features = Array.isArray(features) ? features : (features ? String(features).split('\n').map(s => s.trim()).filter(Boolean) : signal.features);
    signal.accuracy = accuracy ?? signal.accuracy;
    signal.subscribers = subscribers ?? signal.subscribers;
    signal.badge = badge ?? signal.badge;
    signal.badgeColor = badgeColor ?? signal.badgeColor;
    signal.color = color ?? signal.color;
    await signal.save();
    res.json(signal);
  } catch (err) {
    console.error('Admin update signal error:', err);
    res.status(500).json({ error: 'Failed to update signal.' });
  }
});

// Admin: Delete a signal
router.delete('/admin/signals/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const signal = await Signal.findByPk(id);
    if (!signal) return res.status(404).json({ error: 'Signal not found.' });
    await signal.destroy();
    res.json({ success: true, id });
  } catch (err) {
    console.error('Admin delete signal error:', err);
    res.status(500).json({ error: 'Failed to delete signal.' });
  }
});

// Admin: Get all users (basic info)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    // Include balance so admin UI can display real user balances
    const basic = users.map(u => ({ id: u.id, username: u.name, email: u.email, createdAt: u.createdAt, balance: typeof u.balance !== 'undefined' ? Number(u.balance) : 0 }));
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
  // remove the handled kyc activity so it doesn't reappear
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
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
  // remove the handled kyc activity
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
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
  // credit balance and remove the handled activity
  const amt = overrideAmount !== null ? overrideAmount : Number(activities[idx].amount || 0);
  user.balance = Number(user.balance) + amt;
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
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
    console.log('Approve withdrawal called for activityId:', activityId);
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      console.log('Checking user:', user.id, 'activities:', activities.map(a => ({ id: a.id, type: a.type, status: a.status })));
      const idx = activities.findIndex(a => String(a.id) === String(activityId) && a.type === 'withdrawal');
      if (idx !== -1) {
        console.log('Found withdrawal activity:', activities[idx]);
        // Only approve if status is pending
        if (activities[idx].status && activities[idx].status !== 'pending') {
          // Idempotent: already processed -> return success so frontend can refresh UI
          return res.json({ success: true, message: 'Withdrawal already processed.', status: activities[idx].status });
        }
        const amt = Number(activities[idx].amount || 0);
        if (Number(user.balance) < amt) return res.status(400).json({ error: 'Insufficient balance.' });
  user.balance = Number(user.balance) - amt;
  activities[idx].status = 'approved';
  // Update status in Activity table for history
  await Activity.update({ status: 'approved' }, { where: { id: activityId, type: 'withdrawal' } });
  // Remove the approved withdrawal activity from user's activities
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
  await user.save();
  return res.json({ success: true, userId: user.id, balance: user.balance });
      }
    }
    console.log('Withdrawal activity not found for id:', activityId);
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
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
  await user.save();
  return res.json({ success: true, userId: user.id, balance: user.balance });
  } catch (err) {
    console.error('Approve deposit by user error:', err);
    res.status(500).json({ error: 'Failed to approve deposit.' });
  }
});

// Admin: Approve Withdrawal by userId (fallback when activityId isn't present)
router.post('/admin/withdrawals/user/:userId/approve', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const overrideAmount = req.body && typeof req.body.amount !== 'undefined' ? Number(req.body.amount) : null;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    // find latest withdrawal activity
    const found = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'withdrawal');
    if (!found) return res.status(404).json({ error: 'No withdrawal activity found for user.' });
    const idx = found.i;
    // Only approve if status is pending
    if (activities[idx].status && activities[idx].status !== 'pending') {
      // Idempotent: already processed -> return success
      return res.json({ success: true, message: 'Withdrawal already processed.', status: activities[idx].status });
    }
    const amt = overrideAmount !== null ? overrideAmount : Number(activities[idx].amount || 0);
    if (Number(user.balance) < amt) return res.status(400).json({ error: 'Insufficient balance.' });
  user.balance = Number(user.balance) - amt;
  activities[idx].status = 'approved';
  // Update status in Activity table for history
  await Activity.update({ status: 'approved' }, { where: { id: activities[idx].id, type: 'withdrawal' } });
  // Remove the approved withdrawal activity from user's activities
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
  await user.save();
  return res.json({ success: true, userId: user.id, balance: user.balance });
  } catch (err) {
    console.error('Approve withdrawal by user error:', err);
    res.status(500).json({ error: 'Failed to approve withdrawal.' });
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

// Admin: Reject Withdrawal by userId (fallback when activityId isn't present)
router.post('/admin/withdrawals/user/:userId/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const activities = Array.isArray(user.activities) ? user.activities : [];
    // find latest withdrawal activity
    const found = activities.map((a, i) => ({ a, i })).reverse().find(x => x.a.type === 'withdrawal');
    if (!found) return res.status(404).json({ error: 'No withdrawal activity found for user.' });
    const idx = found.i;
    // Only reject if status is pending
    if (activities[idx].status && activities[idx].status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed.' });
    }
  activities[idx].status = 'rejected';
  // Update status in Activity table for history
  await Activity.update({ status: 'rejected' }, { where: { id: activities[idx].id, type: 'withdrawal' } });
  // Remove the rejected withdrawal activity from user's activities
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
  await user.save();
  return res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('Reject withdrawal by user error:', err);
    res.status(500).json({ error: 'Failed to reject withdrawal.' });
  }
});

// Admin: Manual credit to a user (any registered user)
router.post('/admin/credit-user', requireAdmin, async (req, res) => {
  try {
    const { userId, amount, note } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required.' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid amount required.' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // Create a manual credit activity and update balance
    if (!Array.isArray(user.activities)) user.activities = [];
    const activity = { id: uuidv4(), type: 'manual_credit', amount: amt, note: note || null, date: new Date(), status: 'approved' };
    user.activities = [...user.activities, activity];
    user.balance = Number(user.balance || 0) + amt;
    await user.save();
    return res.json({ success: true, userId: user.id, balance: user.balance, activity });
  } catch (err) {
    console.error('Admin manual credit error:', err);
    res.status(500).json({ error: 'Failed to credit user.' });
  }
});

// Reject Withdrawal
router.post('/admin/withdrawals/:activityId/reject', requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;
    const users = await User.findAll();
    console.log('Reject withdrawal called for activityId:', activityId);
    for (const user of users) {
      const activities = Array.isArray(user.activities) ? user.activities : [];
      console.log('Checking user:', user.id, 'activities:', activities.map(a => ({ id: a.id, type: a.type, status: a.status })));
      const idx = activities.findIndex(a => String(a.id) === String(activityId) && a.type === 'withdrawal');
      if (idx !== -1) {
        console.log('Found withdrawal activity:', activities[idx]);
  activities[idx].status = 'rejected';
  // Update status in Activity table for history
  await Activity.update({ status: 'rejected' }, { where: { id: activityId, type: 'withdrawal' } });
  // Remove the rejected withdrawal activity from user's activities
  const updatedActivities = activities.filter((_, i) => i !== idx);
  user.activities = updatedActivities;
  await user.save();
  return res.json({ success: true, userId: user.id });
      }
    }
    console.log('Withdrawal activity not found for id:', activityId);
    res.status(404).json({ error: 'Withdrawal activity not found.' });
  } catch (err) {
    console.error('Reject withdrawal error:', err);
    res.status(500).json({ error: 'Failed to reject withdrawal.' });
  }
});
