import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, addDoc, serverTimestamp, query, orderBy,
  where, runTransaction
} from 'firebase/firestore';
import { db, functions as firebaseFunctions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import type { Member, Partner, Payment, Notification, ContactEnquiry, MembershipPlan, StaffMember, StaffAttendanceRecord } from '../types';

export interface AdminPayment {
  id: string;
  memberUid: string;
  memberName: string;
  memberEmail: string;
  memberSecondaryEmail?: string;
  amount: number;
  plan: string;
  method: 'card' | 'hnb_ipg' | 'bank_transfer' | 'cash';
  status: 'confirmed' | 'pending_verification' | 'pending_cash' | 'rejected';
  receiptUrl?: string;
  createdAt: Date;
}

function parseFirestoreDate(value: unknown): Date {
  if (!value) return new Date();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return new Date(value as string | number);
}

export async function getMember(uid: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, 'members', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Member;
}

export async function generateMembershipId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'memberMeta', `counter_${year}`);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().count as number) : 0;
    const next = current + 1;
    tx.set(counterRef, { count: next, year }, { merge: true });
    return `${year}-${String(next).padStart(4, '0')}`;
  });
}

export async function createMember(uid: string, data: Omit<Member, 'uid' | 'createdAt' | 'role'>): Promise<void> {
  const membershipId = await generateMembershipId();
  await setDoc(doc(db, 'members', uid), { ...data, role: 'customer', membershipId, createdAt: serverTimestamp() });
}

export async function updateMember(uid: string, data: Partial<Member>): Promise<void> {
  await updateDoc(doc(db, 'members', uid), data as Record<string, unknown>);
}

export async function resolvePaymentOwnerUid(uid: string): Promise<string> {
  const member = await getMember(uid);
  if (member?.isSecondaryMember && member.linkedPrimaryUid) {
    return member.linkedPrimaryUid;
  }
  return uid;
}

export async function getPayments(uid: string): Promise<Payment[]> {
  const ownerUid = await resolvePaymentOwnerUid(uid);
  const q = query(collection(db, 'members', ownerUid, 'payments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment);
}

export async function addPayment(uid: string, payment: Omit<Payment, 'id' | 'createdAt'>): Promise<string> {
  const ownerUid = await resolvePaymentOwnerUid(uid);
  const ref = await addDoc(collection(db, 'members', ownerUid, 'payments'), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
export async function addPartner(primaryUid: string, partner: {
  fullName: string;
  dob: Date;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: { name: string; phone: string };
  height: number | null;
  weight: number | null;
  bmi: number | null;
  medicalConditions: string;
  medications: string;
  injuries: string;
  photoUrl: string;
}) {
  const partnerRef = doc(collection(db, 'members', primaryUid, 'partners'));
  await setDoc(partnerRef, { ...partner, createdAt: serverTimestamp() });
  return partnerRef.id;
}

export async function updatePartner(primaryUid: string, partnerId: string, data: Partial<Partner>): Promise<void> {
  await updateDoc(doc(db, 'members', primaryUid, 'partners', partnerId), data as Record<string, unknown>);
}

export async function getPartners(primaryUid: string): Promise<Partner[]> {
  const q = query(collection(db, 'members', primaryUid, 'partners'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      fullName: String(data.fullName || ''),
      dob: parseFirestoreDate(data.dob),
      gender: String(data.gender || ''),
      phone: String(data.phone || ''),
      emergencyContact: {
        name: String((data.emergencyContact as { name?: string })?.name || ''),
        phone: String((data.emergencyContact as { phone?: string })?.phone || ''),
      },
      height: data.height === null || data.height === undefined ? null : Number(data.height),
      weight: data.weight === null || data.weight === undefined ? null : Number(data.weight),
      bmi: data.bmi === null || data.bmi === undefined ? null : Number(data.bmi),
      medicalConditions: String(data.medicalConditions || ''),
      medications: String(data.medications || ''),
      injuries: String(data.injuries || ''),
      photoUrl: String(data.photoUrl || ''),
      address: String(data.address || ''),
      createdAt: parseFirestoreDate(data.createdAt),
    } as Partner;
  });
}

async function getAllPaymentsFromFirestore(): Promise<AdminPayment[]> {
  const membersSnap = await getDocs(collection(db, 'members'));
  const paymentsByMember = await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const memberData = memberDoc.data() as Record<string, unknown>;
      const memberUid = memberDoc.id;
      const paymentsSnap = await getDocs(collection(db, 'members', memberUid, 'payments'));

      return paymentsSnap.docs.map((paymentDoc) => {
        const paymentData = paymentDoc.data() as Record<string, unknown>;
        const method = (paymentData.method as AdminPayment['method']) || 'card';
        const status = (paymentData.status as AdminPayment['status']) || 'pending_verification';

        return {
          id: paymentDoc.id,
          memberUid,
          memberName: String(memberData.fullName || memberData.name || 'Unknown Member'),
          memberEmail: String(memberData.email || ''),
          memberSecondaryEmail: String(memberData.secondaryMemberEmail || ''),
          amount: Number(paymentData.amount) || 0,
          plan: String(paymentData.plan || ''),
          method,
          status,
          receiptUrl: typeof paymentData.receiptUrl === 'string' ? paymentData.receiptUrl : undefined,
          createdAt: parseFirestoreDate(paymentData.createdAt),
        } as AdminPayment;
      });
    })
  );

  return paymentsByMember.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function subscribeAllPayments(callback: (payments: AdminPayment[]) => void) {
  let active = true;

  const load = async () => {
    try {
      const payments = await getAllPaymentsFromFirestore();
      if (active) callback(payments);
    } catch {
      if (active) callback([]);
    }
  };

  void load();

  return () => {
    active = false;
  };
}

export async function setPaymentStatus(uid: string, paymentId: string, status: 'confirmed' | 'rejected', rejectionNote?: string): Promise<void> {
  const paymentRef = doc(db, 'members', uid, 'payments', paymentId);

  if (status === 'rejected') {
    await updateDoc(paymentRef, {
      status,
      rejectionNote: rejectionNote?.trim() || 'Please contact support for details.',
      rejectedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'members', uid), { membershipStatus: 'rejected' });
  } else {
    await updateDoc(paymentRef, { status });
    await updateDoc(doc(db, 'members', uid), { membershipStatus: 'active' });
  }
}

export async function getNotifications(uid: string): Promise<Notification[]> {
  const q = query(collection(db, 'members', uid, 'notifications'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification);
}

export async function getStaffMembers(): Promise<StaffMember[]> {
  const snap = await getDocs(collection(db, 'gym_staff'));
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      fullName: String(data.fullName || ''),
      email: String(data.email || ''),
      phone: String(data.phone || ''),
      role: String(data.role || 'Staff'),
      department: String(data.department || 'General'),
      status: (String(data.status || 'active') as StaffMember['status']),
      createdAt: parseFirestoreDate(data.createdAt),
    } as StaffMember;
  });
}

export async function addStaffMember(data: Omit<StaffMember, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'gym_staff'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  await updateDoc(doc(db, 'gym_staff', id), data as Record<string, unknown>);
}

export async function getStaffAttendanceForDate(date: string): Promise<StaffAttendanceRecord[]> {
  const q = query(collection(db, 'staff_attendance'), where('date', '==', date), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      staffId: String(data.staffId || ''),
      date: String(data.date || ''),
      status: (String(data.status || 'absent') as StaffAttendanceRecord['status']),
      note: String(data.note || ''),
      updatedAt: parseFirestoreDate(data.updatedAt),
    } as StaffAttendanceRecord;
  });
}

export async function getAttendanceLockForDate(date: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'staff_attendance_locks', date));
  return snap.exists() && Boolean((snap.data() as Record<string, unknown>)?.locked);
}

export async function lockAttendanceForDate(date: string): Promise<void> {
  await setDoc(doc(db, 'staff_attendance_locks', date), {
    date,
    locked: true,
    lockedAt: serverTimestamp(),
  });
}

export async function getAttendanceRecordsByDateRange(fromDate: string, toDate: string): Promise<StaffAttendanceRecord[]> {
  const q = query(
    collection(db, 'staff_attendance'),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date', 'asc'),
    orderBy('updatedAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      staffId: String(data.staffId || ''),
      date: String(data.date || ''),
      status: (String(data.status || 'absent') as StaffAttendanceRecord['status']),
      note: String(data.note || ''),
      updatedAt: parseFirestoreDate(data.updatedAt),
    } as StaffAttendanceRecord;
  });
}

export async function saveStaffAttendance(record: Omit<StaffAttendanceRecord, 'id' | 'updatedAt'>): Promise<void> {
  const existingQuery = query(
    collection(db, 'staff_attendance'),
    where('staffId', '==', record.staffId),
    where('date', '==', record.date)
  );
  const snap = await getDocs(existingQuery);
  if (snap.docs.length > 0) {
    await updateDoc(doc(db, 'staff_attendance', snap.docs[0].id), {
      status: record.status,
      note: record.note,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(collection(db, 'staff_attendance'), {
    ...record,
    updatedAt: serverTimestamp(),
  });
}

export async function getAttendanceRecordsForStaff(staffId: string, fromDate: string, toDate: string): Promise<StaffAttendanceRecord[]> {
  const q = query(
    collection(db, 'staff_attendance'),
    where('staffId', '==', staffId),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      staffId: String(data.staffId || ''),
      date: String(data.date || ''),
      status: (String(data.status || 'absent') as StaffAttendanceRecord['status']),
      note: String(data.note || ''),
      updatedAt: parseFirestoreDate(data.updatedAt),
    } as StaffAttendanceRecord;
  });
}

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const snap = await getDocs(collection(db, 'membership_plans'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as MembershipPlan)
    .filter(p => p.isActive);
}

export async function addContactEnquiry(data: Omit<ContactEnquiry, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'contactEnquiries'), { ...data, createdAt: serverTimestamp() });
}

// ── Couple Invite Helpers ───────────────────────────────────────────────────

export interface CoupleInvite {
  id: string;
  primaryUid: string;
  secondaryEmail: string;
  primaryName: string;
  plan: string;
  membershipExpiry: Date;
  inviteExpiry: Date;
  used: boolean;
}

function toDateFromFirestore(value: unknown): Date {
  if (!value) return new Date();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return new Date(value as string | number);
}

export async function getInviteToken(token: string): Promise<CoupleInvite | null> {
  const snap = await getDoc(doc(db, 'couple_invites', token));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    primaryUid: String(data.primaryUid || ''),
    secondaryEmail: String(data.secondaryEmail || ''),
    primaryName: String(data.primaryName || ''),
    plan: String(data.plan || ''),
    membershipExpiry: toDateFromFirestore(data.membershipExpiry),
    inviteExpiry: toDateFromFirestore(data.inviteExpiry),
    used: Boolean(data.used),
  };
}

export async function markInviteUsed(token: string): Promise<void> {
  await updateDoc(doc(db, 'couple_invites', token), { used: true, usedAt: serverTimestamp() });
}

export async function callSendSecondaryMemberInvite(params: {
  primaryUid: string;
  secondaryEmail: string;
  primaryName: string;
  plan: string;
  membershipExpiry?: string;
}): Promise<void> {
  const fn = httpsCallable(firebaseFunctions, 'sendSecondaryMemberInvite');
  await fn(params);
}

