import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    // check both email and username uniqueness to give clearer errors
    const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        kycStatus: 'unverified',
        balance: 0,
        activities: {},
      },
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        kycStatus: user.kycStatus,
        balance: user.balance,
        activities: user.activities,
      },
    });
  } catch (err) {
    // Log the full error on the server for debugging
    console.error('Registration error:', err);

    // Handle Prisma unique constraint errors explicitly when possible
    if (err && err.code === 'P2002') {
      // err.meta.target is an array of fields that violated uniqueness
      const fields = err.meta && err.meta.target ? err.meta.target : [];
      return res.status(409).json({ error: 'Unique constraint failed', fields });
    }

    // Return a helpful message for the client while keeping sensitive details server-side
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        kycStatus: user.kycStatus,
        balance: user.balance,
        activities: user.activities,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

export default router;
