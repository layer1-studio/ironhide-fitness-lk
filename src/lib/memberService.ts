import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, addDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import type { Member, Payment, Notification, ContactEnquiry, MembershipPlan } from '../types';

export interface AdminPayment {
  id: string;
  memberUid: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  plan: string;
  method: 'card' | 'bank_transfer' | 'cash';
  status: 'confirmed' | 'pending_verification' | 'pending_cash' | 'rejected';
  receiptUrl?: string;
  createdAt: Date;
}

function toDate(value: unknown): Date {
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

export async function createMember(uid: string, data: Omit<Member, 'uid' | 'createdAt' | 'role'>): Promise<void> {
  await setDoc(doc(db, 'members', uid), { ...data, role: 'customer', createdAt: serverTimestamp() });
}

export async function updateMember(uid: string, data: Partial<Member>): Promise<void> {
  await updateDoc(doc(db, 'members', uid), data as Record<string, unknown>);
}

export async function getPayments(uid: string): Promise<Payment[]> {
  const q = query(collection(db, 'members', uid, 'payments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment);
}

export async function addPayment(uid: string, payment: Omit<Payment, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'members', uid, 'payments'), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return ref.id;
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
          amount: Number(paymentData.amount) || 0,
          plan: String(paymentData.plan || ''),
          method,
          status,
          receiptUrl: typeof paymentData.receiptUrl === 'string' ? paymentData.receiptUrl : undefined,
          createdAt: toDate(paymentData.createdAt),
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
  await getDoc(paymentRef);

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

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const snap = await getDocs(collection(db, 'membership_plans'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as MembershipPlan)
    .filter(p => p.isActive);
}

export async function addContactEnquiry(data: Omit<ContactEnquiry, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'contact_enquiries'), { ...data, createdAt: serverTimestamp() });
}
