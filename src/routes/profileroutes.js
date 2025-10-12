import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

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
// Separate storage for KYC documents so they live in their own folder
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kyc_documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
  }
});
const uploadKyc = multer({ storage: kycStorage });
import { Plan, Signal } from '../models/index.js';

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
      // Determine proof URL from the uploaded file (multer/Cloudinary)
      let proofUrl = null;
      let proofMeta = null;
      if (req.file) {
        proofMeta = req.file;
        proofUrl = req.file.path || req.file.secure_url || req.file.url || req.file.location || null;
      } else if (req.files && req.files.proof && req.files.proof[0]) {
        const f = req.files.proof[0];
        proofMeta = f;
        proofUrl = f.path || f.secure_url || f.url || f.location || null;
      }
      // Create a pending deposit activity. Admin will approve and credit balance later.
      if (!Array.isArray(user.activities)) user.activities = [];
  const depositActivity = { id: uuidv4(), type: 'deposit', amount: Number(amount), date: new Date(), proof: proofUrl, proofUrl, proofMeta, status: 'pending' };
      user.activities = [...user.activities, depositActivity];
      await user.save();
      // Return activity but don't modify balance yet
      res.json({ activity: depositActivity });
      
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
    res.json(deposits);
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
    const user = await User.findByPk(req.user.userId || req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // Create a pending withdrawal activity. Admin must approve to debit balance.
    if (!Array.isArray(user.activities)) user.activities = [];
    const withdrawalActivity = { id: uuidv4(), type: 'withdrawal', amount: Number(amount), date: new Date(), status: 'pending' };
    user.activities = [...user.activities, withdrawalActivity];
    await user.save();
    res.json({ activity: withdrawalActivity });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Withdrawal failed.' });
  }
});

// GET /api/user/withdrawals
router.get('/withdrawals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId || req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const withdrawals = (user.activities || []).filter(a => a.type === 'withdrawal');
    res.json(withdrawals);
  } catch (err) {
    console.error('Withdrawals error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawals.' });
  }
});

// POST /api/user/plan
router.post('/plan', authenticateToken, async (req, res) => {
  const { planId, amount } = req.body;
  if (!planId) return res.status(400).json({ error: 'Plan ID required.' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Investment amount required.' });
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }
    user.balance -= Number(amount);
    const planActivity = { type: 'plan', planId, amount: Number(amount), date: new Date() };
    user.activities = [...(user.activities || []), planActivity];
    await user.save();
    res.json({ balance: user.balance, activity: planActivity });
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
  // Accept multipart/form-data with files: identityDocument, addressDocument, selfiePhoto
  uploadKyc.fields([
    { name: 'identityDocument', maxCount: 1 },
    { name: 'addressDocument', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 }
  ])(req, res, async function (err) {
    if (err) {
      console.error('KYC multer error:', err);
      return res.status(500).json({ error: 'File upload failed.' });
    }
    try {
      // form fields are in req.body
      const data = { ...req.body };
      // files (if uploaded) will be in req.files
      const files = req.files || {};
      // Helper to extract a usable URL from multer/cloudinary file object
      const extractUrl = (fileObj) => {
        if (!fileObj) return null;
        // multer-storage-cloudinary stores 'path' and sometimes 'filename', cloudinary response may have 'secure_url' or 'url'
        return fileObj.path || fileObj.secure_url || fileObj.url || fileObj.location || null;
      };

      const identityUrl = files.identityDocument && files.identityDocument[0] ? extractUrl(files.identityDocument[0]) : null;
      const addressUrl = files.addressDocument && files.addressDocument[0] ? extractUrl(files.addressDocument[0]) : null;
      const selfieUrl = files.selfiePhoto && files.selfiePhoto[0] ? extractUrl(files.selfiePhoto[0]) : null;

      // Save raw file metadata for debugging/visibility as well as normalized urls
      const filesMeta = {};
      if (files.identityDocument && files.identityDocument[0]) filesMeta.identityDocument = files.identityDocument[0];
      if (files.addressDocument && files.addressDocument[0]) filesMeta.addressDocument = files.addressDocument[0];
      if (files.selfiePhoto && files.selfiePhoto[0]) filesMeta.selfiePhoto = files.selfiePhoto[0];

      const kycData = {
        ...data,
        identityDocumentUrl: identityUrl,
        addressDocumentUrl: addressUrl,
        selfieUrl,
        files: filesMeta
      };

      const user = await User.findByPk(req.user.userId || req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.kycStatus = 'pending';
      if (!Array.isArray(user.activities)) user.activities = [];
  const activity = { id: uuidv4(), type: 'kyc', kycData, date: new Date(), status: 'pending' };
      user.activities = [...user.activities, activity];
      await user.save();
      res.json(activity);
    } catch (err) {
      console.error('KYC error:', err);
      res.status(500).json({ error: 'KYC submission failed.' });
    }
  });
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
