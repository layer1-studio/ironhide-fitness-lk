// Usage (from functions/):  npm run build && DATABASE_URL=... npm run migrate
import * as fs from 'fs';
import * as path from 'path';
import { getPool } from './pool';

async function main() {
  const dir = path.resolve(__dirname, '../../db/migrations');
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    console.log('Applying', file);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
  console.log('Migrations complete');
}
main().catch((e) => { console.error(e); process.exit(1); });
