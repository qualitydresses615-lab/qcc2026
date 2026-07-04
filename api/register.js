// api/register.js
// POST /api/register
// Public endpoint. Creates a new creator registration.
//
// Why this is race-free:
// The `id` column in Postgres is backed by a SEQUENCE (see schema.sql).
// When two people submit the registration form at the exact same
// millisecond, Postgres itself serializes the two INSERTs and hands
// each one a distinct, strictly-increasing id — there is no
// "read the last ID, add 1, write it back" step in our code that could
// race. That read-modify-write pattern is what caused the fake
// in-memory version to risk duplicate IDs; a real sequence-backed
// column eliminates that class of bug entirely.

const { sql, toPublicCreator } = require('../lib/db');
const { checkRateLimit } = require('../lib/rateLimit');
const { sendRegistrationWhatsapp } = require('../lib/whatsapp');

function isValidMobile(m) {
  return typeof m === 'string' && /^[6-9]\d{9}$/.test(m.trim());
}

// Instagram handles are letters, numbers, periods and underscores,
// max 30 chars (Instagram's own limit). Anything else is rejected
// instead of silently stored — closes off garbage/script-like input.
function isValidInstagram(h) {
  return typeof h === 'string' && /^[a-zA-Z0-9._]{1,30}$/.test(h);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Basic anti-spam throttle: max 6 registration attempts per IP per
  // 10 minutes. Legitimate users never hit this; scripted bulk
  // registration does.
  const allowed = await checkRateLimit(req, 'register', 6, 600);
  if (!allowed) {
    res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let { name, mobile, instagram, age, gender, city } = body;

    name = (name || '').trim().slice(0, 60);
    mobile = (mobile || '').trim();
    instagram = (instagram || '').trim().replace(/^@+/, '');
    city = (city || '').trim().slice(0, 40) || 'Bharuch';
    // Age & gender were removed from the public registration form; keep
    // the columns nullable in the DB and just store null if absent.
    const ageNum = age ? parseInt(age, 10) : null;
    gender = gender || null;

    if (!name || !mobile || !instagram) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!isValidMobile(mobile)) {
      res.status(400).json({ error: 'Invalid mobile number' });
      return;
    }
    if (!isValidInstagram(instagram)) {
      res.status(400).json({ error: 'Invalid Instagram username' });
      return;
    }

    // Duplicate-mobile check: if this mobile already registered, return
    // their existing record instead of creating a second one (mirrors
    // the original frontend's "duplicate mobile prevention" behavior).
    const existing = await sql`
      SELECT * FROM creators WHERE mobile = ${mobile} LIMIT 1
    `;
    if (existing.rows.length > 0) {
      res.status(200).json({
        creator: toPublicCreator(existing.rows[0]),
        duplicate: true,
      });
      return;
    }

    const inserted = await sql`
      INSERT INTO creators (name, mobile, instagram, age, gender, city, status)
      VALUES (${name}, ${mobile}, ${instagram}, ${ageNum}, ${gender}, ${city}, 'pending')
      RETURNING *
    `;

    const creator = toPublicCreator(inserted.rows[0]);

    // Best-effort: never let a WhatsApp API hiccup fail the registration.
    await sendRegistrationWhatsapp(mobile, name, creator.id).catch(() => {});

    res.status(201).json({
      creator,
      duplicate: false,
    });
  } catch (err) {
    console.error('register error', err);
    // Unique violation on mobile (race between the check above and insert)
    if (err && err.code === '23505') {
      try {
        const { sql: sql2 } = require('../lib/db');
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const mobile = (body.mobile || '').trim();
        const existing = await sql2`SELECT * FROM creators WHERE mobile = ${mobile} LIMIT 1`;
        if (existing.rows.length > 0) {
          const { toPublicCreator: tpc } = require('../lib/db');
          res.status(200).json({ creator: tpc(existing.rows[0]), duplicate: true });
          return;
        }
      } catch (e2) {
        // fall through to generic error
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
