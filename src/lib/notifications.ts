import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { messaging, db } from './firebase';

export async function registerFCMToken(uid: string): Promise<void> {
  try {
    const m = await messaging;
    if (!m) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(m, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (!token) return;
    await updateDoc(doc(db, 'members', uid), { fcmToken: token });
  } catch { /* not supported */ }
}

export async function onForegroundMessage(callback: (payload: { notification?: { title?: string; body?: string } }) => void): Promise<(() => void) | undefined> {
  const m = await messaging;
  if (!m) return;
  return onMessage(m, callback);
}
