import { auth } from '../lib/firebase';

const API_BASE_URL = (import.meta.env.VITE_BIOMETRIC_API_URL || '/biometric-api').replace(/\/$/, '');

export interface VerifyResponse {
  access_granted: boolean;
  message: string;
  firebase_uid: string | null;
  distance_score: number | null;
  membership_status: string | null;
  membership_expiry: string | null;
  payment_status: string | null;
}

export interface EnrollResponse {
  status: string;
  message: string;
}

async function getHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to use the biometric scanner.');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(body?.detail || body?.message || `Biometric API error (${response.status})`);
  }
  return body as T;
}

export async function verifyTurnstileFace(base64Image: string, gateId: string = 'gate_1'): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/verify`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      gate_id: gateId,
      image_base64: base64Image,
    }),
  });

  return parseResponse<VerifyResponse>(response);
}

export async function enrollMemberFace(firebaseUid: string, base64Image: string): Promise<EnrollResponse> {
  const response = await fetch(`${API_BASE_URL}/enroll`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      firebase_uid: firebaseUid,
      image_base64: base64Image,
    }),
  });

  return parseResponse<EnrollResponse>(response);
}