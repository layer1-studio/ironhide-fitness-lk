import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { generateAndSendInvoice } from './invoiceService';
// ── Environment Variables ────────────────────────────────────────────────────
// Set these in functions/.env.local (development) or Firebase Secret Manager (production)
const HNB_ACCESS_KEY    = process.env.HNB_CYBERSOURCE_ACCESS_KEY  ?? '';
const HNB_PROFILE_ID    = process.env.HNB_CYBERSOURCE_PROFILE_ID  ?? '';
const HNB_SECRET_KEY    = process.env.HNB_CYBERSOURCE_SECRET_KEY  ?? '';
// Sandbox: https://testsecureacceptance.cybersource.com/pay
// Production: https://secureacceptance.cybersource.com/pay
const HNB_ENDPOINT      = process.env.HNB_CYBERSOURCE_ENDPOINT    ?? 'https://testsecureacceptance.cybersource.com/pay';
const RECAPTCHA_SECRET  = process.env.RECAPTCHA_SECRET_KEY         ?? '';
const APP_URL           = process.env.APP_URL                      ?? 'http://localhost:5173';
const HNB_WEBHOOK_URL   = process.env.HNB_WEBHOOK_URL              ?? 'https://us-central1-ironhide-fitness.cloudfunctions.net/hnbIpgWebhook';
const HNB_RETURN_URL    = process.env.HNB_RETURN_URL               ?? 'https://us-central1-ironhide-fitness.cloudfunctions.net/hnbIpgReturn';
const HNB_SUCCESS_URL   = `${APP_URL}/payment-success`;
const HNB_FAILED_URL    = `${APP_URL}/payment-failed`;
// Velocity limit: max attempts per uid per window
const RATE_LIMIT_MAX     = 5;
const RATE_LIMIT_WINDOW  = 10 * 60 * 1000; // 10 minutes in ms
const db = admin.firestore();

function generateUuid(): string {
  return crypto.randomUUID();
}
/**
 * Formats a Date as CyberSource's required ISO 8601 UTC string.
 * e.g. "2026-09-17T06:32:05Z"
 */
function formatCyberSourceDate(date: Date): string {
  return date.toISOString().replace(/\.\d+Z$/, 'Z');
}
/**
 * Signs the CyberSource Simple Order API payload with HMAC-SHA256.
 * The signature covers all fields listed in `signed_field_names`.
 */
function signCyberSourcePayload(
  fields: Record<string, string>,
  signedFieldNames: string[],
  secretKey: string
): string {
  const dataToSign = signedFieldNames.map(field => `${field}=${fields[field] ?? ''}`).join(',');
  return crypto.createHmac('sha256', secretKey).update(dataToSign).digest('base64');
}
/**
 * Verifies the HMAC-SHA256 signature on incoming CyberSource webhook POST data.
 */
function verifyCyberSourceSignature(
  params: Record<string, string>,
  secretKey: string
): boolean {
  const signedFieldNames = (params['signed_field_names'] ?? '').split(',');
  const expected = signCyberSourcePayload(params, signedFieldNames, secretKey);
  const received = params['signature'] ?? '';
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

function parseCyberSourceParams(body: unknown): Record<string, string> {
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
  if (Buffer.isBuffer(body)) {
    return Object.fromEntries(new URLSearchParams(body.toString('utf8')).entries());
  }
  if (body && typeof body === 'object') {
    return Object.fromEntries(
      Object.entries(body as Record<string, unknown>).map(([key, value]) => [key, String(value ?? '')])
    );
  }
  return {};
}
/**
 * Checks and increments the HNB payment attempt rate limit for a given uid.
 * Throws if the limit has been exceeded.
 */
async function checkRateLimit(uid: string): Promise<void> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  const rateLimitRef = db.collection('hnb_rate_limits').doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateLimitRef);
    const data = snap.exists ? snap.data() ?? {} : {};
    const attempts: number[] = (data['attempts'] as number[] | undefined) ?? [];
    // Drop attempts older than the window
    const recentAttempts = attempts.filter((ts) => ts > windowStart);
    if (recentAttempts.length >= RATE_LIMIT_MAX) {
      throw new Error(`Too many payment attempts. Please wait before trying again.`);
    }
    recentAttempts.push(now);
    tx.set(rateLimitRef, { attempts: recentAttempts, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
}
/**
 * Verifies a Google reCAPTCHA v2 token with Google's API.
 */
async function verifyRecaptcha(token: string, remoteIp?: string): Promise<void> {
  if (!RECAPTCHA_SECRET) {
    console.warn('[HNB IPG] RECAPTCHA_SECRET_KEY not set — skipping reCAPTCHA verification (dev mode).');
    return;
  }
  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });
  const res = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const result = await res.json() as { success: boolean; 'error-codes'?: string[] };
  if (!result.success) {
    console.error('[HNB IPG] reCAPTCHA verification failed:', result['error-codes']);
    throw new Error('reCAPTCHA verification failed. Please complete the security check and try again.');
  }
}
// ── Membership activation helper (mirrors Stripe's handlePaymentSuccess) ─────
async function activateMembership(params: {
  uid: string;
  planId: string;
  planName: string;
  amount: number;
  transactionId: string;
  authorizationCode: string;
}): Promise<void> {
  const { uid, planId, planName, amount, transactionId, authorizationCode } = params;
  console.log('[HNB IPG] Activating membership for uid:', uid, 'plan:', planName);
  const durationMonths: Record<string, number> = {
    Daily: 0,
    Monthly: 1,
    Quarterly: 3,
    Annual: 12,
    'Annual — Couple': 12,
  };
  const expiry = new Date();
  if (planName === 'Daily') {
    expiry.setDate(expiry.getDate() + 1);
  } else {
    const months = durationMonths[planName] ?? 1;
    expiry.setMonth(expiry.getMonth() + months);
    if (planName === 'Annual — Couple' || planName === 'Annual') {
      expiry.setDate(expiry.getDate() - 1);
    }
  }
  const memberRef = db.collection('members').doc(uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    console.error('[HNB IPG] Member not found for uid:', uid);
    throw new Error(`Member not found for uid: ${uid}`);
  }
  const batch = db.batch();
  batch.update(memberRef, {
    membershipStatus: 'active',
    membershipTier: planName,
    membershipExpiry: admin.firestore.Timestamp.fromDate(expiry),
  });
  const paymentRef = memberRef.collection('payments').doc();
  batch.set(paymentRef, {
    amount,
    plan: planName,
    planId: planId ?? '',
    method: 'hnb_ipg',
    status: 'confirmed',
    hnbTransactionId: transactionId,
    hnbAuthorizationCode: authorizationCode,
    receiptUrl: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const notifRef = memberRef.collection('notifications').doc();
  batch.set(notifRef, {
    message: `Your ${planName} membership has been activated via HNB IPG card payment! Expiry: ${expiry.toDateString()}.`,
    type: 'payment_confirmed',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
  console.log('[HNB IPG] Membership activated for uid:', uid);
  // ── Invoice email (non-fatal) ──────────────────────────────────────────────
  try {
    const updatedSnap = await memberRef.get();
    const memberData = updatedSnap.data();
    if (memberData?.email) {
      await generateAndSendInvoice({
        uid,
        memberEmail:   memberData.email,
        memberName:    memberData.fullName  ?? 'Member',
        memberTIN:     memberData.tin       ?? '',
        memberPhone:   memberData.phone     ?? '',
        memberAddress: memberData.address   ?? '—',
        plan:          planName,
        amount,
        paymentMethod: 'card',
        stripeSessionId: transactionId,      // reuse field for HNB transaction ID
        deliveryDate:  new Date(),
        placeOfSupply: '114C Negombo Rd, Wattala, Sri Lanka',
      });
      console.log('[HNB IPG] Invoice email sent for uid:', uid);
    }
  } catch (err) {
    console.warn('[HNB IPG] Invoice email failed (non-fatal):', err);
  }
  // ── FCM push notification (non-fatal) ─────────────────────────────────────
  try {
    const snap = await memberRef.get();
    const tokens: string[] = snap.data()?.fcmTokens ?? [];
    if (tokens.length) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'Payment Confirmed ✓',
          body: `Your ${planName} membership is now active via HNB IPG. Expires: ${expiry.toDateString()}.`,
        },
      });
    }
  } catch (err) {
    console.warn('[HNB IPG] FCM push failed (non-fatal):', err);
  }
}
// ── Cloud Function 1: Create HNB Checkout Session ────────────────────────────
export const createHnbCheckoutSession = onRequest(
  {
    cors: true,
    invoker: 'public',
    secrets: [
      'HNB_CYBERSOURCE_ACCESS_KEY',
      'HNB_CYBERSOURCE_PROFILE_ID',
      'HNB_CYBERSOURCE_SECRET_KEY',
      'RECAPTCHA_SECRET_KEY',
    ],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      console.log('[HNB IPG] createHnbCheckoutSession called');
      // ── 1. Verify Firebase Auth token ──────────────────────────────────────
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid auth token' });
        return;
      }
      let uid: string;
      let email: string | undefined;
      try {
        const decoded = await admin.auth().verifyIdToken(authHeader.substring(7));
        uid = decoded.uid;
        email = decoded.email;
      } catch (err: unknown) {
        console.error('[HNB IPG] Token verification failed:', err);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }
      // ── 2. Validate CyberSource credentials are configured ─────────────────
      if (!HNB_ACCESS_KEY || !HNB_PROFILE_ID || !HNB_SECRET_KEY) {
        console.error('[HNB IPG] CyberSource credentials not configured');
        res.status(503).json({
          error: 'HNB IPG payment gateway is not yet configured. Please use another payment method or contact support.',
        });
        return;
      }
      // ── 3. Parse + validate request body ──────────────────────────────────
      const { planId, planName, amount, recaptchaToken } = req.body as {
        planId: string;
        planName: string;
        amount: number;
        recaptchaToken: string;
        billToName?: string;
        billToAddress?: string;
        billToPhone?: string;
      };
      if (!planId || !planName || !amount) {
        res.status(400).json({ error: 'Missing required fields: planId, planName, amount' });
        return;
      }
      if (!recaptchaToken) {
        res.status(400).json({ error: 'Missing reCAPTCHA token. Please complete the security check.' });
        return;
      }
      // ── 4. Verify reCAPTCHA v2 token ───────────────────────────────────────
      await verifyRecaptcha(recaptchaToken, req.ip);
      // ── 5. Session velocity check (HNB requirement) ────────────────────────
      await checkRateLimit(uid);
      // ── 6. Build CyberSource Simple Order API signed payload ───────────────
      const transactionUuid = generateUuid();
const signedDateTime = formatCyberSourceDate(new Date());
const referenceNumber = `IHF-${uid.slice(0, 8)}-${Date.now()}`;
// All amounts must be formatted with 2 decimal places
const amountStr = (Math.round(amount * 100) / 100).toFixed(2);
 
// ── Billing address (required by CyberSource AVS checks) ───────────────
// TODO: once the checkout UI collects real billing details, replace these
// req.body fallbacks with required fields and validate them like planId/amount.
const {
  billToName,
  billToAddress,
  billToPhone,
  billToFirstName,
  billToLastName,
  billToCity,
  billToState,
  billToZip,
  billToCountry,
} = req.body as Record<string, string>;

const nameParts = (billToName || '').trim().split(/\s+/).filter(Boolean);
const billToForename = nameParts.shift() || 'Member';
const billToSurname = nameParts.join(' ') || 'Customer';
 
const billingFields: Record<string, string> = {
  bill_to_forename: billToFirstName || billToForename,
  bill_to_surname: billToLastName || billToSurname,
  bill_to_address_line1: billToAddress || '114C Negombo Rd',
  bill_to_address_city: billToCity || 'Wattala',
  bill_to_address_state: billToState || 'Western',
  bill_to_address_postal_code: billToZip || '11300',
  bill_to_address_country: billToCountry || 'LK',
  bill_to_phone: billToPhone || '0770000000',
};
 
const signedFieldNames = [
  'access_key',
  'profile_id',
  'transaction_uuid',
  'signed_field_names',
  'unsigned_field_names',
  'signed_date_time',
  'locale',
  'transaction_type',
  'reference_number',
  'amount',
  'currency',
  'bill_to_email',
  'bill_to_forename',
  'bill_to_surname',
  'bill_to_address_line1',
  'bill_to_address_city',
  'bill_to_address_state',
  'bill_to_address_postal_code',
  'bill_to_address_country',
  'bill_to_phone',
  'notification_url',
];
const unsignedFieldNames = ['line_item_count', 'item_0_name', 'item_0_quantity', 'item_0_unit_price'];
const fields: Record<string, string> = {
  // Signed fields
  access_key: HNB_ACCESS_KEY,
  profile_id: HNB_PROFILE_ID,
  transaction_uuid: transactionUuid,
  signed_field_names: signedFieldNames.join(','),
  unsigned_field_names: unsignedFieldNames.join(','),
  signed_date_time: signedDateTime,
  locale: 'en',
  transaction_type: 'sale',
  reference_number: referenceNumber,
  amount: amountStr,
  currency: 'LKR',
  bill_to_email: email ?? '',
  ...billingFields,
  notification_url: HNB_WEBHOOK_URL,
  // Unsigned fields
  line_item_count: '1',
  item_0_name: `IronHide Fitness — ${planName} Membership`,
  item_0_quantity: '1',
  item_0_unit_price: amountStr,
  // Override URLs — CyberSource will redirect the browser here
  override_custom_receipt_page: `${HNB_RETURN_URL}?session_id=${encodeURIComponent(transactionUuid)}`,
  override_custom_cancel_page: `${APP_URL}/renew?hnb=cancelled`,
};
      // Add override URLs to signed fields for security
      signedFieldNames.push('override_custom_receipt_page', 'override_custom_cancel_page');
      fields['signed_field_names'] = signedFieldNames.join(',');
      // Generate HMAC-SHA256 signature
      fields['signature'] = signCyberSourcePayload(fields, signedFieldNames, HNB_SECRET_KEY);
      // ── 7. Persist pending session in Firestore ────────────────────────────
      await db.collection('hnb_sessions').doc(transactionUuid).set({
        uid,
        planId,
        planName,
        amount,
        referenceNumber,
        transactionUuid,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[HNB IPG] Session created:', transactionUuid, 'for uid:', uid);
      res.status(200).json({
        endpoint: HNB_ENDPOINT,
        fields,
        sessionId: transactionUuid,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[HNB IPG] createHnbCheckoutSession error:', error?.message ?? err);
              res.status(500).json({
          error: 'Failed to create HNB payment session. Please try again.',
          details: error?.message ?? 'Unknown error',
        });
      }
    }
  
);
async function processHnbPayment(params: Record<string, string>): Promise<void> {
  const decision = (params['decision'] ?? '').trim().toUpperCase();
  const transactionUuid = params['transaction_uuid'] ?? params['req_transaction_uuid'] ?? params['session_id'] ?? '';
  const transactionId = params['transaction_id'] ?? params['req_transaction_id'] ?? '';
  const authorizationCode = params['auth_code'] ?? params['req_auth_code'] ?? '';
  if (!transactionUuid) throw new Error('CyberSource response did not include transaction UUID');
  const sessionRef = db.collection('hnb_sessions').doc(transactionUuid);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    throw new Error(`Unknown HNB session: ${transactionUuid}`);
  }

  const session = sessionSnap.data() as {
    uid: string;
    planId: string;
    planName: string;
    amount: number;
    status: string;
  };

  if (session.status !== 'pending') {
    console.warn('[HNB IPG] Session already processed:', transactionUuid, 'status:', session.status);
    return;
  }

  if (decision === 'ACCEPT') {
    await activateMembership({
      uid: session.uid,
      planId: session.planId,
      planName: session.planName,
      amount: session.amount,
      transactionId,
      authorizationCode,
    });
    await sessionRef.update({ status: 'completed', transactionId, authorizationCode, processedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('[HNB IPG] Payment accepted and membership activated for uid:', session.uid);
    return;
  }

  await sessionRef.update({
    status: 'failed',
    decision,
    reasonCode: params['reason_code'] ?? '',
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const memberRef = db.collection('members').doc(session.uid);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    await memberRef.collection('payments').add({
      amount: session.amount,
      plan: session.planName,
      planId: session.planId,
      method: 'hnb_ipg',
      status: 'rejected',
      hnbTransactionId: transactionId,
      hnbDecision: decision,
      hnbReasonCode: params['reason_code'] ?? '',
      receiptUrl: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.warn('[HNB IPG] Payment declined/errored for uid:', session.uid, 'decision:', decision);
}

// ── Cloud Function 2: HNB IPG Webhook (CyberSource Notification) ─────────────
export const hnbIpgWebhook = onRequest(
  {
    cors: false,   // Webhook from CyberSource — no CORS needed
    invoker: 'public',
    secrets: ['HNB_CYBERSOURCE_SECRET_KEY', 'GMAIL_USER', 'GMAIL_PASS'],
  },
  async (req, res) => {
    console.log('[HNB IPG Webhook] Received notification');
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    try {
      // CyberSource sends form-encoded POST (application/x-www-form-urlencoded)
      const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
      const requestBody = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
        ? req.body
        : rawBody ?? req.body;
      const params = parseCyberSourceParams(requestBody);
      console.log('[HNB IPG Webhook] decision:', params['decision'], 'reasonCode:', params['reason_code'], 'fields:', Object.keys(params));
      console.log('[HNB IPG] FULL CyberSource response:', JSON.stringify(params, null, 2));

      // ── 1. Verify HMAC-SHA256 signature ────────────────────────────────────
      if (!HNB_SECRET_KEY) {
        console.error('[HNB IPG Webhook] HNB_CYBERSOURCE_SECRET_KEY not configured');
        res.status(200).send('OK'); // Always 200 to CyberSource, log internally
        return;
      }
      if (!verifyCyberSourceSignature(params, HNB_SECRET_KEY)) {
        console.error('[HNB IPG Webhook] Signature verification FAILED — possible tampering');
        res.status(200).send('OK'); // Don't expose failure reason to caller
        return;
      }
      console.log('[HNB IPG Webhook] Signature verified ✓');
      await processHnbPayment(params);
      res.status(200).send('OK');
    } catch (err) {
      console.error('[HNB IPG Webhook] Unexpected error:', err);
      // Always respond 200 to CyberSource — it will retry on non-200
      res.status(200).send('OK');
    }
  }
);

// ── Cloud Function 3: browser return fallback ───────────────────────────────
// CyberSource can redirect the customer without delivering notification_url.
// Process the signed return before redirecting the browser to the app.
export const hnbIpgReturn = onRequest(
  { cors: false, invoker: 'public', secrets: ['HNB_CYBERSOURCE_SECRET_KEY', 'GMAIL_USER', 'GMAIL_PASS'] },
  async (req, res) => {
    try {
      const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
      const bodyParams = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
        ? parseCyberSourceParams(req.body)
        : parseCyberSourceParams(rawBody ?? {});
      const params = { ...parseCyberSourceParams(req.query), ...bodyParams };
      console.log('[HNB IPG] FULL CyberSource response:', JSON.stringify(params, null, 2));
      const accepted = (params['decision'] ?? '').trim().toUpperCase() === 'ACCEPT';
      let paymentSucceeded = false;
      if (HNB_SECRET_KEY && verifyCyberSourceSignature(params, HNB_SECRET_KEY)) {
        await processHnbPayment(params);
        paymentSucceeded = accepted;
      } else {
        console.error('[HNB IPG Return] Signature verification failed');
      }

      res.redirect(302, paymentSucceeded ? HNB_SUCCESS_URL : HNB_FAILED_URL);
    } catch (err) {
      console.error('[HNB IPG Return] Unexpected error:', err);
      res.redirect(302, HNB_FAILED_URL);
    }
  }
);
