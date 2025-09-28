const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    trim: true,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  totalLoss: {
    type: Number,
    default: 0
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_submitted'],
    default: 'not_submitted'
  },
  tradingLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  avatar: {
    type: String,
    default: ''
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  // Preferences
  preferences: {
    currency: {
      type: String,
      default: 'USD'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    trading: {
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      autoTrade: {
        type: Boolean,
        default: false
      }
    }
  },
  // Trading statistics
  stats: {
    totalDeposits: {
      type: Number,
      default: 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0
    },
    activeTrades: {
      type: Number,
      default: 0
    },
    completedTrades: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Generate referral code before saving
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = this.firstName.toLowerCase() + Math.random().toString(36).substring(2, 8);
  }
  next();
});

// Update login statistics
userSchema.methods.updateLoginStats = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Calculate win rate
userSchema.methods.calculateWinRate = function() {
  if (this.totalTrades === 0) return 0;
  const wins = this.totalTrades - (this.totalLoss > 0 ? 1 : 0);
  return Math.round((wins / this.totalTrades) * 100);
};

// Update trading stats
userSchema.methods.updateTradingStats = function(profit, isWin) {
  this.totalTrades += 1;
  if (isWin) {
    this.totalProfit += profit;
  } else {
    this.totalLoss += Math.abs(profit);
  }
  this.winRate = this.calculateWinRate();
  return this.save();
};

// Create indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);