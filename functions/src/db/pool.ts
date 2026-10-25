import { Pool } from 'pg';

// DATABASE_URL is a Firebase secret:  firebase functions:secrets:set DATABASE_URL
// e.g. postgresql://user:pass@host:5432/ironhide_scans?sslmode=require
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    pool = new Pool({
      connectionString,
      max: 3,                         // each function instance is small; keep total connections low
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: /sslmode=disable/.test(connectionString) ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (e) => console.error('[pg] idle client error', e));
  }
  return pool;
}
