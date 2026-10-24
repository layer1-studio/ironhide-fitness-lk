import * as functions from 'firebase-functions';
import type { Change, EventContext } from 'firebase-functions';
import type { DocumentSnapshot } from 'firebase-functions/v1/firestore';
import { getPool } from './db/pool';

const RUN: functions.RuntimeOptions = { secrets: ['DATABASE_URL'], timeoutSeconds: 60 };
const EMBEDDING_DIM = 512;      // must match vector(512) in 001_init.sql
const MAX_POINTS = 20_000;

const toDate = (v: any): Date | null =>
  v?.toDate ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null;

// ── 1. Live sync: Firestore members/{uid} → Postgres users ────────────────────
export const syncMemberToPostgres = functions
  .runWith(RUN)
  .firestore.document('members/{uid}')
  .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    const uid = context.params.uid as string;
    const pool = getPool();

    if (!change.after.exists) {                       // member deleted → cascade-delete scans
      await pool.query('DELETE FROM users WHERE uid = $1', [uid]);
      return;
    }
    const d = change.after.data()!;
    await pool.query(
      `INSERT INTO users (uid, full_name, email, phone, role, membership_tier, membership_status, membership_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uid) DO UPDATE SET
         full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
         role = EXCLUDED.role, membership_tier = EXCLUDED.membership_tier,
         membership_status = EXCLUDED.membership_status, membership_expiry = EXCLUDED.membership_expiry,
         updated_at = now()`,
      [uid, d.fullName ?? null, d.email ?? null, d.phone ?? null, d.role ?? 'customer',
       d.membershipTier ?? null, d.membershipStatus ?? null, toDate(d.membershipExpiry)],
    );
  });

// ── 2. Save a scan (callable; auth required) ──────────────────────────────────
export const saveScan = functions.runWith(RUN).https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const uid = context.auth.uid;

  const { points3d, embedding, scanType = 'face', device = null, meta = {} } = data ?? {};

  if (!['face', 'body', 'other'].includes(scanType))
    throw new functions.https.HttpsError('invalid-argument', 'Invalid scanType');

  if (points3d != null) {
    const ok = Array.isArray(points3d) && points3d.length > 0 && points3d.length <= MAX_POINTS &&
      points3d.every((p: any) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite));
    if (!ok) throw new functions.https.HttpsError('invalid-argument', `points3d must be 1–${MAX_POINTS} [x,y,z] triples`);
  }
  if (embedding != null) {
    const ok = Array.isArray(embedding) && embedding.length === EMBEDDING_DIM && embedding.every(Number.isFinite);
    if (!ok) throw new functions.https.HttpsError('invalid-argument', `embedding must be ${EMBEDDING_DIM} numbers`);
  }
  if (points3d == null && embedding == null)
    throw new functions.https.HttpsError('invalid-argument', 'Provide points3d and/or embedding');

  const { rows } = await getPool().query(
    `INSERT INTO scans (uid, scan_type, points_3d, embedding, device, meta)
     VALUES ($1,$2,$3::jsonb,$4::vector,$5,$6::jsonb) RETURNING id, created_at`,
    [uid, scanType, points3d ? JSON.stringify(points3d) : null,
     embedding ? `[${embedding.join(',')}]` : null, device, JSON.stringify(meta)],
  ).catch((e) => {
    // FK failure = Firestore→Postgres sync hasn't landed yet
    if (e.code === '23503') throw new functions.https.HttpsError('failed-precondition', 'Profile not synced yet, retry shortly');
    throw e;
  });
  return { id: rows[0].id, createdAt: rows[0].created_at };
});

// ── 3. List the caller's scans (metadata only, no raw points) ─────────────────
export const listMyScans = functions.runWith(RUN).https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { rows } = await getPool().query(
    `SELECT id, scan_type, point_count, device, created_at
       FROM scans WHERE uid = $1 ORDER BY created_at DESC LIMIT 50`,
    [context.auth.uid],
  );
  return rows;
});
