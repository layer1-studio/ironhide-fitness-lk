-- IronHide scan database (separate from Firestore). Run once per environment.
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Live mirror of Firestore members/{uid}. Only what the scan DB needs (no medical data).
CREATE TABLE IF NOT EXISTS users (
  uid               text PRIMARY KEY,           -- Firebase Auth UID
  full_name         text,
  email             text,
  phone             text,
  role              text NOT NULL DEFAULT 'customer',
  membership_tier   text,
  membership_status text,
  membership_expiry timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

-- Scanned data. Deleting a user removes their scans (erasure requests).
CREATE TABLE IF NOT EXISTS scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid         text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  scan_type   text NOT NULL DEFAULT 'face' CHECK (scan_type IN ('face','body','other')),
  points_3d   jsonb,            -- [[x,y,z], ...] raw 3D vector/point data
  point_count integer GENERATED ALWAYS AS (jsonb_array_length(points_3d)) STORED,
  embedding   vector(512),      -- optional feature vector for similarity search
  device      text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (points_3d IS NOT NULL OR embedding IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS scans_uid_created_idx ON scans (uid, created_at DESC);
CREATE INDEX IF NOT EXISTS scans_embedding_hnsw_idx
  ON scans USING hnsw (embedding vector_cosine_ops);
