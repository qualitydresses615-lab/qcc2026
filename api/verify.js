// api/verify.js
// GET /api/verify?id=QCC-1000
// Public endpoint backing the QR-code "verify" page
// (https://qualitydresses.in/qcc/verify/QCC-1000).
// Deliberately returns only non-sensitive fields — no mobile number —
// since this endpoint is reachable by anyone who scans a badge's QR code.

const { sql } = require('../lib/db');
const { checkRateLimit } = require('../lib/rateLimit');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // A genuine QR-code scan is an occasional, one-off lookup. A script
  // looping through QCC-1000, QCC-1001, ... to scrape every creator's
  // name/Instagram handle is not — this throttle makes that loop
  // impractically slow without blocking normal verification use.
  const allowed = await checkRateLimit(req, 'verify', 20, 300);
  if (!allowed) {
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return;
  }

  const raw = (req.query.id || '').toString().trim();
  const match = raw.match(/^QCC-(\d+)$/i);
  if (!match) {
    res.status(400).json({ error: 'Invalid Creator ID' });
    return;
  }
  const dbId = parseInt(match[1], 10);

  try {
    const { rows } = await sql`
      SELECT id, name, instagram, status, city, created_at
      FROM creators WHERE id = ${dbId} LIMIT 1
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const row = rows[0];
    res.status(200).json({
      id: `QCC-${row.id}`,
      name: row.name,
      insta: row.instagram,
      status: row.status,
      city: row.city,
      ts: row.created_at,
      verified: true,
    });
  } catch (err) {
    console.error('verify error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
