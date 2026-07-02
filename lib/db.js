// lib/db.js
// Shared database helper. Uses the standard `pg` driver directly against
// the POSTGRES_URL / DATABASE_URL connection string Vercel injects when
// you attach a Postgres database (Prisma Postgres / Neon) to this
// project. We use `pg` instead of `@vercel/postgres` because
// `@vercel/postgres`'s default `sql` tag requires a specifically
// *pooled* connection string — the connection string Vercel's current
// Postgres marketplace integration provides is a *direct* connection
// string, which caused `invalid_connection_string` errors. `pg`'s Pool
// works with either format, so this is the more robust choice.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Tagged-template helper so every other file in this project — which
// already calls `sql\`SELECT ... WHERE x = ${value}\`` — keeps working
// completely unchanged. Converts the tagged template into a
// parameterized query ($1, $2, ...) and runs it through the pool.
function sql(strings, ...values) {
  let text = '';
  const params = [];
  strings.forEach((str, i) => {
    text += str;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });
  return pool.query(text, params);
}

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
