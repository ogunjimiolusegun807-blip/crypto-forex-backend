import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
// Cloudinary config (use environment variables for credentials)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'deposit_proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
  }
});

const multer = (await import('multer')).default;
const upload = multer({ storage });
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
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      id: user.id,
      username: user.name,
      email: user.email
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});


// POST /api/user/deposit
router.post('/deposit', authenticateToken, async (req, res) => {
  upload.single('proof')(req, res, async function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(500).json({ error: 'File upload failed.' });
    }
    const amount = req.body.amount;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });
    try {
      const user = await User.findByPk(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.balance += Number(amount);
      let proofUrl = null;
      if (req.file && req.file.path) {
        proofUrl = req.file.path; // Cloudinary URL
      }
      // Ensure activities is always an array
      if (!Array.isArray(user.activities)) {
        user.activities = [];
      }
      const depositActivity = { type: 'deposit', amount: Number(amount), date: new Date(), proof: proofUrl };
      user.activities = [...user.activities, depositActivity];
      await user.save();
      res.json({ balance: user.balance, activity: depositActivity });
    } catch (err) {
      console.error('Deposit error:', err);
      res.status(500).json({ error: 'Deposit failed.' });
    }
  });
});

// GET /api/user/deposits
router.get('/deposits', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
  const activities = Array.isArray(user.activities) ? user.activities : [];
  const deposits = activities.filter(a => a.type === 'deposit');
    res.json({ deposits });
  } catch (err) {
    console.error('Deposits error:', err);
    res.status(500).json({ error: 'Failed to fetch deposits.' });
  }
});

// POST /api/user/withdrawal
router.post('/withdrawal', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance.' });
    user.balance -= amount;
    const withdrawalActivity = { type: 'withdrawal', amount, date: new Date() };
    user.activities = [...(user.activities || []), withdrawalActivity];
    await user.save();
    res.json({ balance: user.balance, activity: withdrawalActivity });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Withdrawal failed.' });
  }
});

// GET /api/user/withdrawals
router.get('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const withdrawals = (user.activities || []).filter(a => a.type === 'withdrawal');
    res.json({ withdrawals });
  } catch (err) {
    console.error('Withdrawals error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawals.' });
  }
});

// POST /api/user/plan
router.post('/plan', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'Plan ID required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const planActivity = { type: 'plan', planId, date: new Date() };
    user.activities = [...(user.activities || []), planActivity];
    await user.save();
    res.json({ activity: planActivity });
  } catch (err) {
    console.error('Plan error:', err);
    res.status(500).json({ error: 'Plan subscription failed.' });
  }
});

// GET /api/user/plans
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const plans = (user.activities || []).filter(a => a.type === 'plan');
    res.json({ plans });
  } catch (err) {
    console.error('Plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// POST /api/user/signal/subscribe
router.post('/signal/subscribe', authenticateToken, async (req, res) => {
  const { signalId } = req.body;
  if (!signalId) return res.status(400).json({ error: 'Signal ID required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const signalActivity = { type: 'signal', signalId, date: new Date() };
    user.activities = [...(user.activities || []), signalActivity];
    await user.save();
    res.json({ activity: signalActivity });
  } catch (err) {
    console.error('Signal error:', err);
    res.status(500).json({ error: 'Signal subscription failed.' });
  }
});

// GET /api/user/signals
router.get('/signals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const signals = (user.activities || []).filter(a => a.type === 'signal');
    res.json({ signals });
  } catch (err) {
    console.error('Signals error:', err);
    res.status(500).json({ error: 'Failed to fetch signals.' });
  }
});

// POST /api/user/kyc
router.post('/kyc', authenticateToken, async (req, res) => {
  const { kycData } = req.body;
  if (!kycData) return res.status(400).json({ error: 'KYC data required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.kycStatus = 'pending';
    user.activities = [...(user.activities || []), { type: 'kyc', kycData, date: new Date() }];
    await user.save();
    res.json({ kycStatus: user.kycStatus });
  } catch (err) {
    console.error('KYC error:', err);
    res.status(500).json({ error: 'KYC submission failed.' });
  }
});

// GET /api/user/kyc
router.get('/kyc', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const kycActivities = (user.activities || []).filter(a => a.type === 'kyc');
    res.json({ kycStatus: user.kycStatus, kycActivities });
  } catch (err) {
    console.error('KYC fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch KYC status.' });
  }
});

// PUT /api/user/settings
router.put('/settings', authenticateToken, async (req, res) => {
  const { settings } = req.body;
  if (!settings) return res.status(400).json({ error: 'Settings required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.activities = [...(user.activities || []), { type: 'settings', settings, date: new Date() }];
    await user.save();
    res.json({ settings });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Settings update failed.' });
  }
});

// GET /api/user/settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const settingsActivities = (user.activities || []).filter(a => a.type === 'settings');
    res.json({ settingsActivities });
  } catch (err) {
    console.error('Settings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// POST /api/user/referral
router.post('/referral', authenticateToken, async (req, res) => {
  const { referredEmail } = req.body;
  if (!referredEmail) return res.status(400).json({ error: 'Referred email required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.activities = [...(user.activities || []), { type: 'referral', referredEmail, date: new Date() }];
    await user.save();
    res.json({ referredEmail });
  } catch (err) {
    console.error('Referral error:', err);
    res.status(500).json({ error: 'Referral failed.' });
  }
});

// GET /api/user/referrals
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const referrals = (user.activities || []).filter(a => a.type === 'referral');
    res.json({ referrals });
  } catch (err) {
    console.error('Referrals error:', err);
    res.status(500).json({ error: 'Failed to fetch referrals.' });
  }
});

export default router;
