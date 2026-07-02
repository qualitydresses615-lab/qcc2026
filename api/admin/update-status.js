// api/admin/update-status.js
// POST /api/admin/update-status  { id: "QCC-1000", status: "approved" | "rejected" | "pending" }
// Protected — requires a valid admin session token.

const { sql, toPublicCreator } = require('../../lib/db');
const { verifySession } = require('../../lib/auth');

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ok = await verifySession(req.headers.authorization);
  if (!ok) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawId = (body.id || '').toString().trim();
    const status = (body.status || '').toString().trim();

    const match = rawId.match(/^QCC-(\d+)$/i);
    if (!match || !ALLOWED_STATUSES.has(status)) {
      res.status(400).json({ error: 'Invalid id or status' });
      return;
    }
    const dbId = parseInt(match[1], 10);

    const { rows } = await sql`
      UPDATE creators SET status = ${status}
      WHERE id = ${dbId}
      RETURNING *
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json({ creator: toPublicCreator(rows[0]) });
  } catch (err) {
    console.error('update-status error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
