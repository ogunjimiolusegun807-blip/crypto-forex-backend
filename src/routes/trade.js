const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const User = require('../models/User');

// Open a trade
router.post('/open', async (req, res) => {
  try {
    const { userId, symbol, amount, multiplier, entryPrice } = req.body;
    const user = await User.findById(userId);
    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance or user not found.' });
    }
    // Optionally lock amount
    user.balance -= amount;
    await user.save();
    const trade = await Trade.create({ userId, symbol, amount, multiplier, entryPrice });
    res.json({ trade, balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close a trade
router.post('/close', async (req, res) => {
  try {
    const { tradeId, exitPrice } = req.body;
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== 'open') {
      return res.status(400).json({ error: 'Trade not found or already closed.' });
    }
    const profitLoss = (exitPrice - trade.entryPrice) * trade.amount * trade.multiplier;
    trade.exitPrice = exitPrice;
    trade.profitLoss = profitLoss;
    trade.status = 'closed';
    trade.closedAt = new Date();
    await trade.save();
    const user = await User.findById(trade.userId);
    user.balance += profitLoss;
    await user.save();
    res.json({ trade, balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;