// lib/db.js
// Thin shared helper around @vercel/postgres.
// @vercel/postgres automatically reads the POSTGRES_URL / POSTGRES_URL_NON_POOLING
// env vars that Vercel injects when you attach a Vercel Postgres (Neon) database
// to this project — no manual connection-string wiring needed.

const { sql } = require('@vercel/postgres');

function creatorCode(id) {
  return `QCC-${id}`;
}

// Maps a raw DB row to the shape the frontend expects.
function toPublicCreator(row) {
  return {
    id: creatorCode(row.id),
    dbId: row.id,
    name: row.name,
    mobile: row.mobile,
    insta: row.instagram,
    age: row.age,
    gender: row.gender,
    city: row.city,
    status: row.status,
    ts: row.created_at, // ISO timestamp string
  };
}

module.exports = { sql, creatorCode, toPublicCreator };
