const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth, verifiedUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get user transactions with pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // deposit, withdrawal, trade, referral
    const status = req.query.status; // pending, completed, failed

    const query = { userId: req.user.id };
    
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email');

    const total = await Transaction.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          pages,
          total,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get specific transaction
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('userId', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/transactions/deposit
// @desc    Create deposit request
// @access  Private
router.post('/deposit', [
  auth,
  verifiedUser,
  body('amount').isFloat({ min: 10 }).withMessage('Minimum deposit amount is $10'),
  body('method').isIn(['bank_transfer', 'credit_card', 'crypto', 'paypal']).withMessage('Invalid payment method'),
  body('currency').optional().isIn(['USD', 'EUR', 'BTC', 'ETH']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { amount, method, currency = 'USD', note } = req.body;

    // Create transaction record
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'deposit',
      amount,
      currency,
      method,
      status: 'pending',
      description: `Deposit via ${method}`,
      metadata: {
        note: note || '',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await transaction.save();

    // In a real app, you would integrate with payment processors here
    // For now, we'll just create the pending transaction

    res.status(201).json({
      success: true,
      message: 'Deposit request created successfully. Processing may take a few minutes.',
      data: { transaction }
    });

  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/transactions/withdrawal
// @desc    Create withdrawal request
// @access  Private
router.post('/withdrawal', [
  auth,
  verifiedUser,
  body('amount').isFloat({ min: 20 }).withMessage('Minimum withdrawal amount is $20'),
  body('method').isIn(['bank_transfer', 'crypto', 'paypal']).withMessage('Invalid withdrawal method'),
  body('address').notEmpty().trim().withMessage('Withdrawal address/account is required'),
  body('currency').optional().isIn(['USD', 'EUR', 'BTC', 'ETH']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { amount, method, address, currency = 'USD', note } = req.body;

    // Check if user has sufficient balance
    const user = await User.findById(req.user.id);
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'withdrawal',
      amount: -amount, // Negative for withdrawal
      currency,
      method,
      status: 'pending',
      description: `Withdrawal via ${method}`,
      metadata: {
        address,
        note: note || '',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await transaction.save();

    // Reserve the amount (reduce user balance)
    user.balance -= amount;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully. Processing may take 24-48 hours.',
      data: { transaction }
    });

  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/transactions/summary
// @desc    Get transaction summary/statistics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate transaction data
    const summary = await Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type amount currency status createdAt description');

    // Format summary data
    const formattedSummary = {};
    summary.forEach(item => {
      formattedSummary[item._id] = {
        total: item.total,
        count: item.count,
        pending: item.pending,
        completed: item.completed,
        failed: item.failed
      };
    });

    res.json({
      success: true,
      data: {
        summary: formattedSummary,
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Get transaction summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;