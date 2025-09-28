const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', [auth, adminAuth], async (req, res) => {
  try {
    // Mock admin dashboard data
    const dashboardStats = {
      totalUsers: 0,
      activeUsers: 0,
      totalTransactions: 0,
      pendingTransactions: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      systemStatus: 'operational'
    };

    res.json({
      success: true,
      data: { stats: dashboardStats }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin view)
// @access  Private (Admin only)
router.get('/users', [auth, adminAuth], async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Admin user management coming soon',
      data: { users: [] }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;