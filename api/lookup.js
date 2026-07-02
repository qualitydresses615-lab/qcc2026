// api/lookup.js
// GET /api/lookup?mobile=9876543210
// Public endpoint used by the "My Creator Profile" modal. Looks a
// registration up by mobile number so a creator can find their badge
// again from any device (this is exactly the cross-device case the
// old in-memory/localStorage version could never support).

const { sql, toPublicCreator } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const mobile = (req.query.mobile || '').toString().trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    res.status(400).json({ error: 'Invalid mobile number' });
    return;
  }

  try {
    const { rows } = await sql`
      SELECT * FROM creators WHERE mobile = ${mobile} LIMIT 1
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json({ creator: toPublicCreator(rows[0]) });
  } catch (err) {
    console.error('lookup error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
