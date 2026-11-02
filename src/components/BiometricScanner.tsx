import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { verifyTurnstileFace, enrollMemberFace } from '../services/biometricService';
import { getAuth } from 'firebase/auth';

export const BiometricScanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const capturePhoto = async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      return image.base64String || null;
    } catch (error) {
      console.warn('Camera closed or failed', error);
      return null;
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage('Opening camera...');
    try {
      const base64 = await capturePhoto();
      if (!base64) return;

      setMessage('Checking face against database...');
      const res = await verifyTurnstileFace(base64, 'gate_1');
      setMessage(res.access_granted ? '✅ Access Granted! Gate Unlocked.' : `⛔ Denied: ${res.message}`);
    } catch (err: any) {
      setMessage('Error connecting to FastAPI backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setLoading(true);
    setMessage('Opening camera...');
    
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      setMessage('⚠️ You must be logged into the web app to enroll your face.');
      setLoading(false);
      return;
    }

    try {
      const base64 = await capturePhoto();
      if (!base64) return;

      setMessage('Extracting face vector & saving...');
      const res = await enrollMemberFace(currentUser.uid, base64);
      setMessage(`✅ Success: ${res.message}`);
    } catch (err: any) {
      setMessage('Enrollment failed. Is the Python API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-800 mx-auto mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-cyan-400 tracking-tight">IronHide</h2>
        <p className="text-slate-400 text-sm mt-1">Biometric Access Gateway</p>
      </div>
      
      <button 
        onClick={handleVerify} 
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-4 rounded-xl disabled:opacity-50 transition-all shadow-lg"
      >
        Scan Face (Enter Gym)
      </button>

      <button 
        onClick={handleEnroll} 
        disabled={loading}
        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-50 transition-colors"
      >
        Register My Face
      </button>

      {message && (
        <div className="mt-4 p-4 w-full text-center rounded-lg font-medium text-sm bg-slate-800 border border-slate-700 text-cyan-400">
          {message}
        </div>
      )}
    </div>
  );
};