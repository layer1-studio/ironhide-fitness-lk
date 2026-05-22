import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, addDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import type { Member, Payment, Notification, ContactEnquiry, MembershipPlan } from '../types';

export async function getMember(uid: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, 'members', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Member;
}

export async function createMember(uid: string, data: Omit<Member, 'uid' | 'createdAt'>): Promise<void> {
  await setDoc(doc(db, 'members', uid), { ...data, createdAt: serverTimestamp() });
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
