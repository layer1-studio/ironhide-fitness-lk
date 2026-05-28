import { Capacitor } from '@capacitor/core';

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    // NativeBiometric plugin — gracefully unavailable if not installed
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch { return false; }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason: 'Verify your identity to access IronHide',
      title: 'IronHide Login',
      subtitle: 'Use Face ID or fingerprint',
      description: '',
    });
    return true;
  } catch { return false; }
}
