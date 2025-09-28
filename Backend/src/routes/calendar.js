const express = require('express');

const router = express.Router();

// @route   GET /api/calendar
// @desc    Get economic calendar events
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Mock calendar data - will integrate with real economic calendar API later
    const mockEvents = [
      {
        id: '1',
        title: 'Non-Farm Payrolls',
        description: 'US employment change for the previous month',
        country: 'USD',
        currency: 'USD',
        impact: 'high',
        actual: '225K',
        forecast: '200K',
        previous: '180K',
        time: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
        category: 'employment'
      },
      {
        id: '2',
        title: 'ECB Interest Rate Decision',
        description: 'European Central Bank announces interest rate decision',
        country: 'EUR',
        currency: 'EUR',
        impact: 'high',
        actual: null,
        forecast: '4.50%',
        previous: '4.50%',
        time: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
        category: 'interest-rates'
      }
    ];

    const { date, impact, currency } = req.query;
    
    let filteredEvents = mockEvents;
    
    if (impact) {
      filteredEvents = filteredEvents.filter(event => event.impact === impact);
    }
    
    if (currency) {
      filteredEvents = filteredEvents.filter(event => event.currency === currency);
    }

    res.json({
      success: true,
      data: {
        events: filteredEvents,
        total: filteredEvents.length
      }
    });

  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;