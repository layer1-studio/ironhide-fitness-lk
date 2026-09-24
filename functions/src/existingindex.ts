import * as functions from 'firebase-functions';
import type { QueryDocumentSnapshot, DocumentSnapshot } from 'firebase-functions/v1/firestore';
import type { EventContext, Change } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateAndSendInvoice } from './invoiceService';
import { sendRejectionEmail } from './invoiceService';
import { sendSecondaryMemberInviteEmail, sendMembershipStatusEmail } from './emailservice';



admin.initializeApp();
const db = admin.firestore();

// 1. Welcome notification on new member
export const onMemberCreated = functions.firestore
  .document('members/{uid}')
  .onCreate(async (snap: QueryDocumentSnapshot, context: EventContext) => {
    const uid = context.params.uid;
    const data = snap.data();
    const tokens: string[] = data.fcmTokens ?? [];
    if (!tokens.length) return;
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: 'Welcome to IronHide!', body: `Your membership is being processed, ${data.fullName?.split(' ')[0] ?? 'Champion'}.` },
    });
    await db.collection('members').doc(uid).collection('notifications').add({
      message: `Welcome to IronHide, ${data.fullName?.split(' ')[0] ?? 'Champion'}! Your membership is being processed.`,
      type: 'welcome', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// Notify members when an administrator activates or deactivates membership.
export const onMembershipStatusChanged = functions
  .runWith({ secrets: ['GMAIL_USER', 'GMAIL_PASS'] })
  .firestore
  .document('members/{uid}')
  .onUpdate(async (change: Change<QueryDocumentSnapshot>, context: EventContext) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.membershipStatus === after.membershipStatus) return;

    const status = after.membershipStatus;
    if (status !== 'active' && status !== 'expired') return;
    if (after.membershipStatusSource !== 'admin') return;
    if (!after.email) {
      console.warn('[onMembershipStatusChanged] Member has no email:', context.params.uid);
      return;
    }

    try {
      await sendMembershipStatusEmail({
        memberEmail: after.email,
        memberName: after.fullName ?? 'Member',
        status,
        membershipTier: after.membershipTier,
        membershipExpiry: after.membershipExpiry?.toDate?.()?.toLocaleDateString('en-LK'),
      });
    } catch (err) {
      console.warn('[onMembershipStatusChanged] Email failed (non-fatal):', err);
    }
  });

// 2. Daily expiry reminders
export const checkMembershipExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('members').where('membershipStatus', '==', 'active').get();
    const promises = snap.docs.map(async (memberDoc: admin.firestore.QueryDocumentSnapshot) => {
      const data = memberDoc.data();
      const expiry: admin.firestore.Timestamp = data.membershipExpiry;
      if (!expiry) return;
      const daysLeft = Math.ceil((expiry.toMillis() - now.toMillis()) / 86400000);
      if (![14, 7, 1].includes(daysLeft)) return;
      const msg = `Your IronHide membership expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to keep your access.`;
      await memberDoc.ref.collection('notifications').add({ message: msg, type: 'expiry_reminder', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      const tokens: string[] = data.fcmTokens ?? [];
      if (!tokens.length) return;
      await admin.messaging().sendEachForMulticast({ tokens, notification: { title: 'Membership Expiring Soon', body: msg } });
    });
    await Promise.all(promises);
  });

// 3. On payment confirmed — activate membership and send verification email if needed
export const onPaymentConfirmed = functions .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASS"] }) .firestore
  .document('members/{uid}/payments/{paymentId}')
  .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
    if (!change.after.exists) return;
    const before = change.before.data();
    const after = change.after.data();
    if (!after) return;
    if (after.status !== 'confirmed') return;
    if (before && before.status === 'confirmed') return;
    const uid = context.params.uid;
    const paymentId = context.params.paymentId;
    const plan = (after.plan as string) ?? '';
    const expiry = new Date();
    if (plan.toLowerCase() === 'daily') {
      expiry.setDate(expiry.getDate() + 1);
    } else if (plan.toLowerCase().startsWith('annual')) {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else if (plan.toLowerCase() === 'quarterly') {
      expiry.setMonth(expiry.getMonth() + 3);
    } else {
      // Monthly (default)
      expiry.setMonth(expiry.getMonth() + 1);
    }
    
    const memberSnap = await db.collection('members').doc(uid).get();
    const memberData = memberSnap.data();
    const emailVerificationPending = memberData?.emailVerificationPending ?? false;
    
    await db.collection('members').doc(uid).update({
      membershipStatus: 'active',
      membershipExpiry: admin.firestore.Timestamp.fromDate(expiry),
      emailVerificationPending: false,
    });
    
    // Send verification email if it was pending (for bank transfer and cash payments)
    if (emailVerificationPending) {
      try {
        const userEmail = memberData?.email;
        if (userEmail) {
          const auth = admin.auth();
          const user = await auth.getUserByEmail(userEmail);
          await auth.updateUser(user.uid, { emailVerified: true });
          console.log(`[onPaymentConfirmed] Email verified for user ${uid}`);
        }
      } catch (err) {
        console.error(`[onPaymentConfirmed] Error sending verification for ${uid}:`, err);
      }
    }
    
    // Send invoice email for manually-confirmed bank transfer / cash payments
    try {
      const method = after.method as string | undefined;
      if (memberData?.email && (method === 'bank_transfer' || method === 'cash')) {
        await generateAndSendInvoice({
          uid,
          memberEmail: memberData.email,
          memberName: memberData.fullName ?? 'Member',
          memberTIN: memberData.tin ?? '',
          memberPhone: memberData.phone ?? '',
          memberAddress: memberData.address ?? '—',
          plan: after.plan ?? 'Membership',
          amount: Number(after.amount ?? 0),
          paymentMethod: method === 'cash' ? 'cash' : 'bank_transfer',
          stripeSessionId: after.stripeSessionId ?? undefined,
          deliveryDate: new Date(),
          placeOfSupply: '114C Negombo Rd, Wattala, Sri Lanka',
        });
        console.log(`[onPaymentConfirmed] Invoice sent to ${memberData.email} for uid ${uid}, payment ${paymentId}`);
      }
    } catch (err) {
      console.warn('[onPaymentConfirmed] Invoice generation/email failed (non-fatal):', err);
    }
    
    await db.collection('members').doc(uid).collection('notifications').add({
      message: `Your ${after.plan as string} membership has been activated! Expiry: ${expiry.toDateString()}.`,
      type: 'payment_confirmed', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const tokens: string[] = memberSnap.data()?.fcmTokens ?? [];
    if (!tokens.length) return;
    await admin.messaging().sendEachForMulticast({ tokens, notification: { title: 'Membership Activated!', body: `Your ${after.plan as string} membership is now active.` } });
  });

// 4. Occupancy counter triggers (increment/decrement via face recognition system)
export const updateOccupancy = functions.https.onCall(async (data: { action: 'enter' | 'exit' }) => {
  const { action } = data;
  const ref = db.collection('gym_meta').doc('occupancy');
  await db.runTransaction(async (tx: admin.firestore.Transaction) => {
    const snap = await tx.get(ref);
    const current: number = snap.exists ? (snap.data()!.count as number) ?? 0 : 0;
    const next = action === 'enter' ? current + 1 : Math.max(0, current - 1);
    tx.set(ref, { count: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
});

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function dayLabel(date: Date) {
  return date.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const getDashboardStats = functions.https.onCall(async (data: { monthsBack?: number; reportMode?: 'monthly' | 'daily' }) => {
  const monthsBack = typeof data?.monthsBack === 'number' && data.monthsBack > 0 ? Math.min(data.monthsBack, 36) : 12;
  const reportMode = data?.reportMode === 'daily' ? 'daily' : 'monthly';
  const now = new Date();
  const buckets = new Map<string, {
    month: string;
    label: string;
    activeMembers: number;
    revenue: number;
    cardRevenue: number;
    bankTransferRevenue: number;
    cashRevenue: number;
    newSignups: number;
    deactivatedMemberships: number;
    cardPayments: number;
    bankTransferPayments: number;
    bankTransferPending: number;
    cashPayments: number;
    cashPending: number;
  }>();

  if (reportMode === 'daily') {
    const daysBack = Math.min(Math.max(monthsBack * 30, 30), 365);
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = dayKey(d);
      buckets.set(key, {
        month: key,
        label: dayLabel(d),
        activeMembers: 0,
        revenue: 0,
        cardRevenue: 0,
        bankTransferRevenue: 0,
        cashRevenue: 0,
        newSignups: 0,
        deactivatedMemberships: 0,
        cardPayments: 0,
        bankTransferPayments: 0,
        bankTransferPending: 0,
        cashPayments: 0,
        cashPending: 0,
      });
    }
  } else {
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      buckets.set(key, {
        month: key,
        label: monthLabel(d),
        activeMembers: 0,
        revenue: 0,
        cardRevenue: 0,
        bankTransferRevenue: 0,
        cashRevenue: 0,
        newSignups: 0,
        deactivatedMemberships: 0,
        cardPayments: 0,
        bankTransferPayments: 0,
        bankTransferPending: 0,
        cashPayments: 0,
        cashPending: 0,
      });
    }
  }

  const paymentsSnap = await db.collectionGroup('payments').get();
  paymentsSnap.docs.forEach((doc) => {
    const payment = doc.data() as any;
    const createdAt = toDate(payment.createdAt);
    if (!createdAt) return;
    const key = reportMode === 'daily' ? dayKey(createdAt) : monthKey(createdAt);
    if (!buckets.has(key)) return;
    const bucket = buckets.get(key)!;
    const method = payment.method as string | undefined;
    const status = payment.status as string | undefined;
    const amount = Number(payment.amount ?? 0);

    if (status === 'confirmed') {
      bucket.revenue += amount;

      if (method === 'card') {
        bucket.cardRevenue += amount;
        bucket.cardPayments += 1;
      }

      if (method === 'bank_transfer') {
        bucket.bankTransferRevenue += amount;
        bucket.bankTransferPayments += 1;
      }

      if (method === 'cash') {
        bucket.cashRevenue += amount;
        bucket.cashPayments += 1;
      }
    }

    if (method === 'bank_transfer' && status === 'pending_verification') {
      bucket.bankTransferPending += 1;
    }

    if (method === 'cash' && status === 'pending_cash') {
      bucket.cashPending += 1;
    }
  });

  const membersSnap = await db.collection('members').get();
  membersSnap.docs.forEach((doc) => {
    const member = doc.data() as any;
    const joinedAt = toDate(member.createdAt);
    if (!joinedAt) return;
    const expiryAt = toDate(member.membershipExpiry);

    if (reportMode === 'daily') {
      const signupKey = dayKey(joinedAt);
      if (buckets.has(signupKey)) {
        buckets.get(signupKey)!.newSignups += 1;
      }

      if (member.membershipStatus === 'expired' && expiryAt) {
        const expiryKey = dayKey(expiryAt);
        if (buckets.has(expiryKey)) {
          buckets.get(expiryKey)!.deactivatedMemberships += 1;
        }
      }

      if (member.membershipStatus === 'rejected' && buckets.has(signupKey)) {
        buckets.get(signupKey)!.deactivatedMemberships += 1;
      }

      return;
    }

    for (const [key, bucket] of buckets) {
      const [year, month] = key.split('-').map(Number);
      const bucketStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const bucketEnd = new Date(year, month, 0, 23, 59, 59, 999);
      const wasActiveDuringMonth = joinedAt <= bucketEnd && (expiryAt ? expiryAt >= bucketStart : member.membershipStatus === 'active');
      if (wasActiveDuringMonth) {
        bucket.activeMembers += 1;
      }
    }

    const signupKey = monthKey(joinedAt);
    if (buckets.has(signupKey)) {
      buckets.get(signupKey)!.newSignups += 1;
    }

    if (member.membershipStatus === 'expired' && expiryAt) {
      const expiryKey = monthKey(expiryAt);
      if (buckets.has(expiryKey)) {
        buckets.get(expiryKey)!.deactivatedMemberships += 1;
      }
    }

    if (member.membershipStatus === 'rejected' && buckets.has(signupKey)) {
      buckets.get(signupKey)!.deactivatedMemberships += 1;
    }
  });

  return {
    monthlyStats: reportMode === 'monthly' ? Array.from(buckets.values()) : [],
    dailyStats: reportMode === 'daily' ? Array.from(buckets.values()) : [],
  };
});

// 5. Capacity threshold alert
export const onCapacityThreshold = functions.firestore
  .document('gym_meta/occupancy')
  .onUpdate(async (change: Change<DocumentSnapshot>) => {
    const before: number = (change.before.data()?.count as number) ?? 0;
    const after: number = (change.after.data()?.count as number) ?? 0;
    const capacity = 50;
    const threshold = Math.floor(capacity * 0.9);
    if (before < threshold && after >= threshold) {
      const membersSnap = await db.collection('members').where('membershipStatus', '==', 'active').get();
      const allTokens: string[] = [];
      membersSnap.docs.forEach((d: admin.firestore.QueryDocumentSnapshot) => {
        const t = d.data().fcmToken as string | undefined;
        if (t) allTokens.push(t);
      });
      if (!allTokens.length) return;
      for (let i = 0; i < allTokens.length; i += 500) {
        await admin.messaging().sendEachForMulticast({
          tokens: allTokens.slice(i, i + 500),
          notification: { title: 'IronHide is at capacity', body: 'The gym is almost full right now. Consider visiting later for a better experience.' },
        });
      }
    }
  });

// DEPLOY AFTER BLAZE UPGRADE
// 6. Payment status notifications — bank transfer approved/rejected + cash confirmed
export const onPaymentStatusChanged = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASS"] })
  .firestore
  .document('members/{uid}/payments/{paymentId}')
  .onUpdate(async (change: Change<QueryDocumentSnapshot>, context: EventContext) => {
    const before = change.before.data() ?? {};
    const after = change.after.data() ?? {};

    if (before.status === after.status) return;

    const uid = context.params.uid as string;
    const paymentId = context.params.paymentId as string;

    const memberSnap = await db.collection('members').doc(uid).get();
    const memberData = memberSnap.data();
    const fcmToken = memberSnap.data()?.fcmToken as string | undefined;
    

    let title = '';
    let body = '';

    if (after.status === 'confirmed' && after.method === 'cash') {
      title = 'Cash Payment Confirmed ✓';
      body = 'Your cash payment has been received. Your membership is now active.';
    } else if (after.status === 'confirmed' && after.method === 'bank_transfer') {
      title = 'Payment Confirmed ✓';
      body = 'Your bank transfer has been verified. Your membership is now active.';
    } else if (after.status === 'rejected') {
      title = 'Payment Not Verified';
      body = 'Your bank transfer receipt could not be verified. Please contact us at 070 322 2211.';
      // Send rejection email
      if (memberData?.email) {
        try {
          await sendRejectionEmail({
            memberEmail: memberData.email,
            memberName: memberData.fullName ?? 'Member',
            paymentId,
            plan: after.plan ?? 'Membership',
            amount: Number(after.amount ?? 0),
            method: after.method ?? 'bank_transfer',
            rejectionNote: after.rejectionNote ?? 'Please contact support for details.',
          });
        } catch (err) {
          console.warn('[onPaymentStatusChanged] Rejection email failed (non-fatal):', err);
        }
      }
    } else {
      return;
    }
    if (fcmToken) {
      await admin.messaging().send({ token: fcmToken, notification: { title, body } });
    }

    
    await db.collection('members').doc(uid).collection('notifications').add({
      message: body,
      type: after.status === 'rejected' ? 'payment_rejected' : 'payment_confirmed',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// 6. Callable function for admin to confirm payment manually and send verification email
export const confirmPaymentAndVerifyEmail = functions.runWith({ secrets: ["GMAIL_USER", "GMAIL_PASS"] }).https.onCall(
  async (data: { uid: string; paymentId: string }) => {
    const { uid, paymentId } = data;
    
    if (!uid || !paymentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'uid and paymentId are required'
      );
    }

    const memberRef = db.collection('members').doc(uid);
    const paymentRef = memberRef.collection('payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Payment record not found'
      );
    }

    const paymentData = paymentSnap.data();
    const memberSnap = await memberRef.get();
    const memberData = memberSnap.data();

    if (!memberData) {
      throw new functions.https.HttpsError(
        'not-found',
        'Member record not found'
      );
    }

    // Update payment status to confirmed
    await paymentRef.update({ status: 'confirmed' });

    // Update membership status and mark email verification as completed
    const durationMonths: Record<string, number> = { 
      Monthly: 1, 
      Quarterly: 3, 
      Annual: 12,
      'Annual — Couple': 12,
      Daily: 0,
    };
    const months = durationMonths[paymentData?.plan as string] ?? 1;
    const expiry = new Date();
    if (paymentData?.plan === 'Daily') {
      expiry.setDate(expiry.getDate() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + months);
      if (paymentData?.plan === 'Annual — Couple' || paymentData?.plan === 'Annual') {
        expiry.setDate(expiry.getDate() - 1);
      }
    }

    await memberRef.update({
      membershipStatus: 'active',
      membershipExpiry: admin.firestore.Timestamp.fromDate(expiry),
      emailVerificationPending: false,
    });

    // Send verification email if it was pending
    if (memberData.emailVerificationPending) {
      try {
        const userEmail = memberData.email;
        if (userEmail) {
          const auth = admin.auth();
          const user = await auth.getUserByEmail(userEmail);
          await auth.updateUser(user.uid, { emailVerified: true });
          console.log(`[confirmPaymentAndVerifyEmail] Email verified for user ${uid}`);
        }
      } catch (err) {
        console.error(`[confirmPaymentAndVerifyEmail] Error verifying email for ${uid}:`, err);
      }
    }

    // Add notification
    await memberRef.collection('notifications').add({
      message: `Your ${paymentData?.plan as string} membership has been activated! Expiry: ${expiry.toDateString()}.`,
      type: 'payment_confirmed',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send FCM notification
    try {
      const tokens: string[] = memberData.fcmTokens ?? [];
      if (tokens.length) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: 'Membership Activated!',
            body: `Your ${paymentData?.plan as string} membership is now active.`,
          },
        });
      }
    } catch (err) {
      console.warn('[confirmPaymentAndVerifyEmail] FCM notification failed:', err);
    }


    return { success: true, message: 'Payment confirmed and email verified' };
  }
);

// 7. Callable — send invite to secondary (couple plan) member
export const sendSecondaryMemberInvite = functions
  .runWith({ secrets: ['GMAIL_USER', 'GMAIL_PASS'] })
  .https.onCall(
    async (data: { primaryUid: string; secondaryEmail: string; primaryName: string; plan: string; membershipExpiry?: string }) => {
      const { primaryUid, secondaryEmail, primaryName, plan, membershipExpiry } = data;

      if (!primaryUid || !secondaryEmail || !primaryName || !plan) {
        throw new functions.https.HttpsError('invalid-argument', 'primaryUid, secondaryEmail, primaryName, and plan are required');
      }

      const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

      // Check if an unused invite already exists for this primary member
      const existingSnap = await db
        .collection('couple_invites')
        .where('primaryUid', '==', primaryUid)
        .where('used', '==', false)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        // Resend using existing token
        const existingDoc = existingSnap.docs[0];
        const setupLink = `${APP_URL}/secondary-setup?token=${existingDoc.id}`;
        await sendSecondaryMemberInviteEmail(secondaryEmail, primaryName, plan, setupLink);
        return { success: true, token: existingDoc.id };
      }

      // Invite token expires in 7 days
      const inviteExpiry = new Date();
      inviteExpiry.setDate(inviteExpiry.getDate() + 7);

      const membershipExpiryDate = membershipExpiry ? new Date(membershipExpiry) : (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d;
      })();

      const inviteRef = await db.collection('couple_invites').add({
        primaryUid,
        secondaryEmail,
        primaryName,
        plan,
        membershipExpiry: admin.firestore.Timestamp.fromDate(membershipExpiryDate),
        inviteExpiry: admin.firestore.Timestamp.fromDate(inviteExpiry),
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const setupLink = `${APP_URL}/secondary-setup?token=${inviteRef.id}`;

      // Store secondaryEmail on the primary member doc so Stripe webhook can access it
      await db.collection('members').doc(primaryUid).update({ secondaryMemberEmail: secondaryEmail });

      await sendSecondaryMemberInviteEmail(secondaryEmail, primaryName, plan, setupLink);

      console.log(`[sendSecondaryMemberInvite] Invite sent to ${secondaryEmail}, token: ${inviteRef.id}`);
      return { success: true, token: inviteRef.id };
    }
  );

