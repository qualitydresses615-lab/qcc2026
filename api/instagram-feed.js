// api/instagram-feed.js
//
// Setup notes (for future reference):
// - INSTAGRAM_PAGE_TOKEN: the permanent Page access token, obtained via
//   Graph API Explorer -> GET me/accounts -> copy that Page's access_token.
//   This token does not expire under normal use.
// - INSTAGRAM_BUSINESS_ID: the Instagram Business Account ID linked to
//   that Page, obtained via GET {page-id}?fields=instagram_business_account
//
const { getRecentPosts } = require('../lib/instagram');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const posts = await getRecentPosts(6);
    // Cache at the edge for an hour — posts don't need second-by-second
    // freshness, and this keeps requests to Meta's API low.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ posts });
  } catch (err) {
    console.error('Instagram feed fetch failed', err);
    res.status(502).json({ error: 'Could not fetch Instagram feed right now' });
  }
};
