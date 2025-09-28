const express = require('express');

const router = express.Router();

// @route   GET /api/news
// @desc    Get latest news
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Mock news data for now - will integrate with real news API later
    const mockNews = [
      {
        id: '1',
        title: 'Bitcoin Reaches New All-Time High',
        excerpt: 'Bitcoin surpasses $75,000 as institutional adoption continues to grow...',
        content: 'Full article content here...',
        category: 'cryptocurrency',
        author: 'Crypto News Team',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        imageUrl: 'https://via.placeholder.com/400x200/0066cc/ffffff?text=Bitcoin+News',
        source: 'CryptoDaily',
        tags: ['bitcoin', 'cryptocurrency', 'market']
      },
      {
        id: '2',
        title: 'Federal Reserve Announces Interest Rate Decision',
        excerpt: 'The Fed maintains current rates while signaling potential changes ahead...',
        content: 'Full article content here...',
        category: 'forex',
        author: 'Financial News Team',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        imageUrl: 'https://via.placeholder.com/400x200/cc6600/ffffff?text=Fed+News',
        source: 'ForexDaily',
        tags: ['fed', 'interest-rates', 'forex']
      }
    ];

    const { page = 1, limit = 10, category } = req.query;
    
    let filteredNews = mockNews;
    if (category) {
      filteredNews = mockNews.filter(news => news.category === category);
    }

    res.json({
      success: true,
      data: {
        news: filteredNews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredNews.length,
          pages: Math.ceil(filteredNews.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/news/:id
// @desc    Get specific news article
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // This would fetch from database in real implementation
    res.json({
      success: true,
      message: 'News article functionality coming soon',
      data: { article: null }
    });
  } catch (error) {
    console.error('Get news article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;