// lib/rateLimit.js
// Simple IP + action based sliding-window rate limiter, backed by the
// `rate_hits` table (see schema.sql). Not perfectly race-free under
// extreme concurrency, but more than enough to stop scripted spam /
// bulk scraping against a small regional contest site.

const { sql } = require('./db');

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

// Returns true if the request is allowed, false if it should be blocked.
// `limit` = max hits allowed inside `windowSeconds`.
async function checkRateLimit(req, key, limit, windowSeconds) {
  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  try {
    const { rows } = await sql`
      SELECT count(*)::int AS c FROM rate_hits
      WHERE ip = ${ip} AND key = ${key} AND ts > ${windowStart}
    `;
    if (rows[0].c >= limit) {
      return false;
    }
    await sql`INSERT INTO rate_hits (ip, key) VALUES (${ip}, ${key})`;
    return true;
  } catch (err) {
    // Fail OPEN on infra errors — a rate-limiter outage should never
    // take down the actual registration flow.
    console.error('rate limit check failed', err);
    return true;
  }
}

module.exports = { checkRateLimit, getClientIp };
