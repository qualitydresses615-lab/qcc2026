// api/count.js
// GET /api/count
// Public, lightweight endpoint used only for the homepage's live counter.
// Deliberately returns just a number — not the full creator list (which
// contains mobile numbers) — since this call fires on every page load
// for every visitor.

const { sql } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { rows } = await sql`SELECT COUNT(*)::int AS count FROM creators`;
    res.status(200).json({ count: rows[0].count });
  } catch (err) {
    console.error('count error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
