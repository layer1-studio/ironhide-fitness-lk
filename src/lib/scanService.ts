import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type Point3D = [number, number, number];

export interface SaveScanInput {
  points3d?: Point3D[];
  embedding?: number[];           // 512 dims
  scanType?: 'face' | 'body' | 'other';
  device?: string;
  meta?: Record<string, unknown>;
}

export const saveScan = async (input: SaveScanInput) =>
  (await httpsCallable<SaveScanInput, { id: string; createdAt: string }>(functions, 'saveScan')(input)).data;

export const listMyScans = async () =>
  (await httpsCallable<void, Array<{ id: string; scan_type: string; point_count: number | null; device: string | null; created_at: string }>>(functions, 'listMyScans')()).data;
