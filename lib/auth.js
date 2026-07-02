// lib/auth.js
const crypto = require('crypto');
const { sql } = require('./db');

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Called after the admin password check succeeds.
// Creates a random opaque session token, stores it server-side with an
// expiry, and returns it to the client. The client sends it back as
// "Authorization: Bearer <token>" on subsequent admin requests.
async function createSession() {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await sql`
    INSERT INTO admin_sessions (token, expires_at)
    VALUES (${token}, ${expiresAt})
  `;
  return { token, expiresAt };
}

// Verifies a bearer token from the Authorization header.
// Returns true/false. Also opportunistically cleans up expired sessions.
async function verifySession(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) return false;

  const { rows } = await sql`
    SELECT token FROM admin_sessions
    WHERE token = ${token} AND expires_at > now()
    LIMIT 1
  `;
  return rows.length === 1;
}

// Constant-time-ish password compare (mitigates trivial timing attacks).
function passwordMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a comparison of equal length buffers to avoid an obvious
    // early-exit timing signal on length mismatch.
    crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createSession, verifySession, passwordMatches };
