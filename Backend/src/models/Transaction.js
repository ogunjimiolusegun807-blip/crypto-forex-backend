const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'trade', 'referral', 'bonus', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'BTC', 'ETH'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'crypto', 'paypal', 'internal'],
    required: function() {
      return this.type === 'deposit' || this.type === 'withdrawal';
    }
  },
  description: {
    type: String,
    required: true,
    maxlength: 255
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  // Transaction hash for crypto transactions
  txHash: {
    type: String,
    sparse: true
  },
  // Related trade ID if transaction is from trading
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    sparse: true
  },
  // Fee information
  fee: {
    amount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  // Additional metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  },
  // Processing timestamps
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  // Balance after transaction
  balanceAfter: {
    type: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate unique reference before saving
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.reference) {
    const prefix = this.type.toUpperCase().substring(0, 3);
    this.reference = `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
  next();
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  const sign = this.amount >= 0 ? '+' : '';
  return `${sign}${this.amount.toFixed(2)} ${this.currency}`;
});

// Update status with timestamp
transactionSchema.methods.updateStatus = function(newStatus, adminNotes = '') {
  this.status = newStatus;
  this.adminNotes = adminNotes;
  
  if (newStatus === 'processing') {
    this.processedAt = new Date();
  } else if (newStatus === 'completed') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Create indexes for better performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);