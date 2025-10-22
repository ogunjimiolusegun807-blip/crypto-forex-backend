import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

// GET /api/market/prices - Proxy CoinGecko prices to avoid CORS/rate limit issues
router.get('/prices', async (req, res) => {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,polkadot&vs_currencies=usd&include_24hr_change=true';
    const response = await fetch(url);
    if (!response.ok) throw new Error('CoinGecko error: ' + response.status);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Market price fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch prices', details: err.message });
  }
});

export default router;
