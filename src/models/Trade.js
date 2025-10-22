// Trade model for live trading
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number },
  profitLoss: { type: Number },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

module.exports = mongoose.model('Trade', TradeSchema);