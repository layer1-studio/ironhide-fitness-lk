// The URL where your Python FastAPI is running
const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface VerifyResponse {
  access_granted: boolean;
  message: string;
  firebase_uid: string | null;
  distance_score: number | null;
}

export interface EnrollResponse {
  status: string;
  message: string;
}

// 1. Verify Face (Opens Gate)
export async function verifyTurnstileFace(base64Image: string, gateId: string = 'gate_1'): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gate_id: gateId,
      image_base64: base64Image,
    }),
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

// 2. Enroll Face (Saves to PostgreSQL)
export async function enrollMemberFace(firebaseUid: string, base64Image: string): Promise<EnrollResponse> {
  const response = await fetch(`${API_BASE_URL}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebase_uid: firebaseUid,
      image_base64: base64Image,
    }),
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}