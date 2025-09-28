const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/plans
// @desc    Get available trading plans
// @access  Public
router.get('/', async (req, res) => {
  try {
    const mockPlans = [
      {
        id: '1',
        name: 'Starter Plan',
        description: 'Perfect for beginners starting their trading journey',
        price: 99,
        duration: 30, // days
        features: [
          'Basic trading signals',
          'Market analysis reports',
          'Email support',
          'Mobile app access'
        ],
        maxTrades: 10,
        profitShare: 70, // percentage
        popular: false
      },
      {
        id: '2',
        name: 'Professional Plan',
        description: 'Advanced features for serious traders',
        price: 299,
        duration: 30,
        features: [
          'Premium trading signals',
          'Advanced market analysis',
          'Priority support',
          'Copy trading access',
          'Risk management tools'
        ],
        maxTrades: 50,
        profitShare: 80,
        popular: true
      },
      {
        id: '3',
        name: 'VIP Plan',
        description: 'Ultimate trading experience with personal manager',
        price: 599,
        duration: 30,
        features: [
          'Exclusive VIP signals',
          'Personal trading manager',
          '24/7 phone support',
          'Custom strategies',
          'Advanced analytics',
          'No trading limits'
        ],
        maxTrades: -1, // unlimited
        profitShare: 90,
        popular: false
      }
    ];

    res.json({
      success: true,
      data: { plans: mockPlans }
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/plans/subscribe
// @desc    Subscribe to a trading plan
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { planId } = req.body;

    // This would handle plan subscription logic
    res.json({
      success: false,
      message: 'Plan subscription functionality coming soon'
    });

  } catch (error) {
    console.error('Subscribe to plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;