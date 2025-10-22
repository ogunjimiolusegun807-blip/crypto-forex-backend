
import express from 'express';
import { Trade, User } from '../models/index.js';
const router = express.Router();

// Get all trade history for authenticated user
router.get('/history', async (req, res) => {
  try {
    // Assume req.userId is set by auth middleware (if not, fallback to query param)
    const userId = req.userId || req.query.userId;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    const trades = await Trade.findAll({
      where: { userId },
      order: [['openedAt', 'DESC']]
    });
    res.json({ trades });
  } catch (err) {
    console.error('Fetch trade history error:', err);
    res.status(500).json({ error: 'Failed to fetch trade history.' });
  }
});

// Open a trade
router.post('/open', async (req, res) => {
  try {
    const { userId, symbol, amount, multiplier, entryPrice } = req.body;
    console.log('Trade open request:', { userId, symbol, amount, multiplier, entryPrice });
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('Open trade: user not found', userId);
      return res.status(404).json({ error: 'User not found.' });
    }
    if (Number(user.balance || 0) < Number(amount || 0)) {
      console.error('Open trade: insufficient balance', { userId, balance: user.balance, amount });
      return res.status(400).json({ error: 'Insufficient balance.' });
    }
    // Debit user balance and create trade
    const newBalance = Number(user.balance || 0) - Number(amount || 0);
    user.balance = newBalance;
    await user.save();
    const trade = await Trade.create({ userId, symbol, amount, multiplier, entryPrice, status: 'open', openedAt: new Date() });
    res.json({ trade, balance: user.balance });
  } catch (err) {
    console.error('Open trade error:', err);
    res.status(500).json({ error: 'Server error opening trade.' });
  }
});

// Close a trade
router.post('/close', async (req, res) => {
  try {
    const { tradeId, exitPrice } = req.body;
    const trade = await Trade.findByPk(tradeId);
    if (!trade || trade.status !== 'open') {
      console.error('Close trade: trade not found or invalid status', { tradeId, trade });
      return res.status(400).json({ error: 'Trade not found or already closed.' });
    }
    const profitLoss = (exitPrice - trade.entryPrice) * trade.amount * trade.multiplier;
    await trade.update({
      exitPrice,
      profitLoss,
      status: 'closed',
      closedAt: new Date()
    });
    const user = await User.findByPk(trade.userId);
    if (!user) {
      console.error('Close trade: user not found for trade', trade.id);
      return res.status(404).json({ error: 'User not found for trade.' });
    }
    user.balance = Number(user.balance || 0) + Number(profitLoss || 0);
    await user.save();
    res.json({ trade, balance: user.balance });
  } catch (err) {
    console.error('Close trade error:', err);
    res.status(500).json({ error: 'Server error closing trade.' });
  }
});

export default router;