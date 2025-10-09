import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to verify JWT and attach user to request
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.userId = decoded.userId;
    next();
  });
}

// GET /api/user/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      kycStatus: user.kycStatus,
      balance: user.balance,
      activities: user.activities,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

export default router;
