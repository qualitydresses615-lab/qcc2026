// lib/instagram.js
// Fetches your most recent Instagram posts via the Graph API, using the
// permanent Page token (see setup notes in api/instagram-feed.js).

async function getRecentPosts(limit = 6) {
  const token = process.env.INSTAGRAM_PAGE_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!token || !igId) {
    throw new Error('Instagram env vars not configured');
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = `https://graph.facebook.com/v20.0/${igId}/media?fields=${fields}&limit=${limit}&access_token=${token}`;

  const resp = await fetch(url);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error('Instagram fetch failed: ' + JSON.stringify(data));
  }

  return (data.data || []).map(post => ({
    id: post.id,
    caption: post.caption ? post.caption.slice(0, 140) : '',
    // Videos don't reliably expose a usable media_url for <img>, so use
    // the thumbnail for video posts and the direct image otherwise.
    image: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
    permalink: post.permalink,
    isVideo: post.media_type === 'VIDEO',
  }));
}

module.exports = { getRecentPosts };
