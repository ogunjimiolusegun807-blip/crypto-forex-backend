const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/kyc
// @desc    Get KYC status
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'KYC functionality coming soon',
      data: { kycStatus: 'not_submitted' }
    });
  } catch (error) {
    console.error('Get KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;