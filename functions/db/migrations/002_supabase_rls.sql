-- Supabase auto-exposes public tables through its REST API using the anon key.
-- Enable RLS with no policies so only our server-side connection (postgres role) can read/write.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
