// api/admin/login.js
// POST /api/admin/login  { password: "..." }
//
// The admin password now lives ONLY in the ADMIN_PASSWORD environment
// variable on Vercel (Project Settings → Environment Variables) — it is
// never present in the HTML/JS shipped to the browser, unlike the
// original static file where "quality2026" sat in plain text in the
// page source, visible to anyone with dev tools open.
//
// On success we issue a random, opaque, short-lived session token
// (see lib/auth.js) instead of just trusting a client-side "isAdmin"
// flag. Every other /api/admin/* route requires this token.

const { passwordMatches, createSession } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const password = body.password || '';

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      // Fails closed: if the env var was never configured, nobody gets in.
      console.error('ADMIN_PASSWORD env var is not set');
      res.status(500).json({ error: 'Server not configured' });
      return;
    }

    if (!passwordMatches(password, expected)) {
      // Deliberately vague error + small delay-free response; no hints
      // about whether "admin" username-equivalent exists, etc.
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    const { token, expiresAt } = await createSession();
    res.status(200).json({ token, expiresAt });
  } catch (err) {
    console.error('admin login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
