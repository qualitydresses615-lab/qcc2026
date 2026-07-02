-- ============================================================
-- QCC 2026 — Database Schema (Vercel Postgres / Neon)
-- Run this once against your Vercel Postgres database.
-- In the Vercel dashboard: Storage → your Postgres DB → Query,
-- paste this whole file and run it. Or use `psql "$POSTGRES_URL" -f schema.sql`
-- ============================================================

-- Creators / registrations table.
-- The `id` column is a real Postgres SERIAL (sequence-backed) column.
-- Sequences in Postgres hand out values atomically and safely even
-- under heavy concurrent inserts — that's what gives us guaranteed
-- unique, gapless-enough sequential Creator IDs without any manual
-- locking or "read-then-write" race condition in application code.
CREATE TABLE IF NOT EXISTS creators (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  mobile        TEXT        NOT NULL UNIQUE,
  instagram     TEXT        NOT NULL,
  age           INTEGER,
  gender        TEXT,
  city          TEXT        NOT NULL DEFAULT 'Bharuch',
  status        TEXT        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creator IDs are formatted as QCC-1000, QCC-1001, ... in the application
-- layer (creator_code = 'QCC-' || id). We start the sequence at 1000 so
-- the first registrant is QCC-1000, matching the original design.
ALTER SEQUENCE creators_id_seq RESTART WITH 1000;

-- Helpful index for admin dashboard filtering/search.
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators (status);
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators (created_at);

-- Simple admin session tokens (short-lived, server-issued on login).
-- We do NOT store the admin password in this table or in the codebase —
-- it lives only in the ADMIN_PASSWORD environment variable on Vercel.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token       TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);
