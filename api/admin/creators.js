// api/admin/creators.js
// GET /api/admin/creators
// Protected — requires "Authorization: Bearer <token>" from /api/admin/login.
// Returns every registration for the admin dashboard (KPIs, table, charts,
// CSV/Excel export). This is the single shared source of truth all admins
// see — unlike the old fake-storage version, where each browser tab only
// ever saw registrations made in that same tab/session.

const { sql, toPublicCreator } = require('../../lib/db');
const { verifySession } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ok = await verifySession(req.headers.authorization);
  if (!ok) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { rows } = await sql`
      SELECT * FROM creators ORDER BY created_at DESC
    `;
    res.status(200).json({ creators: rows.map(toPublicCreator) });
  } catch (err) {
    console.error('admin creators error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
