import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from './firebase';

export async function requestNotificationPermission(uid: string): Promise<void> {
  try {
    const messagingInstance = await messaging;
    if (!messagingInstance) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    if (!token) return;
    await updateDoc(doc(db, 'members', uid), { fcmTokens: arrayUnion(token) });
  } catch {
    // Notifications not supported or blocked
  }
}
