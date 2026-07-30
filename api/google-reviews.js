// api/google-reviews.js
const { getPlaceReviews } = require('../lib/googlePlaces');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Google Places API key not configured' });
    return;
  }

  try {
    const data = await getPlaceReviews(apiKey);
    // Cache for an hour at the edge — reviews don't change minute to minute,
    // and this keeps us well inside the free quota.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    console.error('Google reviews fetch failed', err);
    res.status(502).json({ error: 'Could not fetch reviews right now' });
  }
};
