const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, verifiedUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format')
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

    const { firstName, lastName, phone, country, dateOfBirth } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update only provided fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = {
      balance: user.balance,
      totalProfit: user.totalProfit,
      totalLoss: user.totalLoss,
      totalTrades: user.totalTrades,
      winRate: user.winRate,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings,
      tradingLevel: user.tradingLevel,
      totalDeposits: user.stats.totalDeposits,
      totalWithdrawals: user.stats.totalWithdrawals,
      activeTrades: user.stats.activeTrades,
      completedTrades: user.stats.completedTrades
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  auth,
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH']).withMessage('Invalid currency'),
  body('language').optional().isIn(['en', 'es', 'fr', 'de']).withMessage('Invalid language'),
  body('timezone').optional().trim(),
  body('notifications.email').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('trading.riskLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid risk level'),
  body('trading.autoTrade').optional().isBoolean()
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

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    const { currency, language, timezone, notifications, trading } = req.body;
    
    if (currency !== undefined) user.preferences.currency = currency;
    if (language !== undefined) user.preferences.language = language;
    if (timezone !== undefined) user.preferences.timezone = timezone;
    
    if (notifications) {
      if (notifications.email !== undefined) user.preferences.notifications.email = notifications.email;
      if (notifications.sms !== undefined) user.preferences.notifications.sms = notifications.sms;
      if (notifications.push !== undefined) user.preferences.notifications.push = notifications.push;
    }
    
    if (trading) {
      if (trading.riskLevel !== undefined) user.preferences.trading.riskLevel = trading.riskLevel;
      if (trading.autoTrade !== undefined) user.preferences.trading.autoTrade = trading.autoTrade;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: user.preferences }
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/referral
// @desc    Get user referral information
// @access  Private
router.get('/referral', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referredBy', 'firstName lastName email')
      .select('referralCode referralCount referralEarnings referredBy');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get referred users
    const referredUsers = await User.find({ referredBy: user._id })
      .select('firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const referralData = {
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings,
      referredBy: user.referredBy,
      referredUsers: referredUsers,
      referralLink: `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`
    };

    res.json({
      success: true,
      data: { referral: referralData }
    });

  } catch (error) {
    console.error('Get referral error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;