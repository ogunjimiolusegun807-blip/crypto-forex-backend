import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
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
