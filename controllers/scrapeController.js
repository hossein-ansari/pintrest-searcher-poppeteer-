const jobService = require('../services/jobService');

async function searchImmediate(req, res) {
  const query = (req.query.query || req.query.q || '').toString();
  let count = parseInt(req.query.count || req.query.n || '20', 10);
  count = Math.max(1, Math.min(100, count || 20));
  if (!query) return res.status(400).json({ error: 'Missing query parameter' });

  try {
    const images = await jobService.scrapeNow(query, count);
    return res.json({ query, count: images.length, images });
  } catch (err) {
    console.error('Immediate search error:', err.message || err);
    return res.status(500).json({ error: 'Scrape failed', message: err.message });
  }
}


module.exports = { searchImmediate};
