import express from 'express';
import { Trade, User } from '../models/index.js';
const router = express.Router();

// Open a trade
router.post('/open', async (req, res) => {
  try {
    const { userId, symbol, amount, multiplier, entryPrice } = req.body;
    console.log('Trade open request:', { userId, symbol, amount, multiplier, entryPrice });
    const user = await User.findByPk(userId);
    console.log('User lookup result:', user);
    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance or user not found.' });
    }
    // Optionally lock amount
    await user.update({ balance: user.balance - amount });
    const trade = await Trade.create({ userId, symbol, amount, multiplier, entryPrice });
    res.json({ trade, balance: user.balance - amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close a trade
router.post('/close', async (req, res) => {
  try {
    const { tradeId, exitPrice } = req.body;
    const trade = await Trade.findByPk(tradeId);
    if (!trade || trade.status !== 'open') {
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
    await user.update({ balance: user.balance + profitLoss });
    res.json({ trade, balance: user.balance + profitLoss });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;