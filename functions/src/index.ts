import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// 1. Welcome notification on new member
export const onMemberCreated = functions.firestore
  .document('members/{uid}')
  .onCreate(async (snap, context) => {
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

// 2. Daily expiry reminders
export const checkMembershipExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('members').where('membershipStatus', '==', 'active').get();
    const promises = snap.docs.map(async doc => {
      const data = doc.data();
      const expiry: admin.firestore.Timestamp = data.membershipExpiry;
      if (!expiry) return;
      const daysLeft = Math.ceil((expiry.toMillis() - now.toMillis()) / 86400000);
      if (![14, 7, 1].includes(daysLeft)) return;
      const msg = `Your IronHide membership expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to keep your access.`;
      await doc.ref.collection('notifications').add({ message: msg, type: 'expiry_reminder', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      const tokens: string[] = data.fcmTokens ?? [];
      if (!tokens.length) return;
      await admin.messaging().sendEachForMulticast({ tokens, notification: { title: 'Membership Expiring Soon', body: msg } });
    });
    await Promise.all(promises);
  });

// 3. On payment confirmed — activate membership
export const onPaymentConfirmed = functions.firestore
  .document('members/{uid}/payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status) return;
    if (after.status !== 'confirmed') return;
    const uid = context.params.uid;
    const durationMonths: Record<string, number> = { Monthly: 1, Quarterly: 3, Annual: 12 };
    const months = durationMonths[after.plan] ?? 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    await db.collection('members').doc(uid).update({
      membershipStatus: 'active',
      membershipExpiry: admin.firestore.Timestamp.fromDate(expiry),
    });
    await db.collection('members').doc(uid).collection('notifications').add({
      message: `Your ${after.plan} membership has been activated! Expiry: ${expiry.toDateString()}.`,
      type: 'payment_confirmed', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const memberSnap = await db.collection('members').doc(uid).get();
    const tokens: string[] = memberSnap.data()?.fcmTokens ?? [];
    if (!tokens.length) return;
    await admin.messaging().sendEachForMulticast({ tokens, notification: { title: 'Membership Activated!', body: `Your ${after.plan} membership is now active.` } });
  });

// 4. Occupancy counter triggers (increment/decrement via face recognition system)
export const updateOccupancy = functions.https.onCall(async (data, _context) => {
  const { action } = data as { action: 'enter' | 'exit' };
  const ref = db.collection('gym_meta').doc('occupancy');
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current: number = snap.exists ? snap.data()!.count ?? 0 : 0;
    const next = action === 'enter' ? current + 1 : Math.max(0, current - 1);
    tx.set(ref, { count: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
});
