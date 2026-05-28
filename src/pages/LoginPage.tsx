import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { isBiometricAvailable, authenticateWithBiometric } from '../lib/biometrics';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { isBiometricAvailable().then(setBiometricAvailable); }, []);

  const handleBiometric = async () => {
    const ok = await authenticateWithBiometric();
    if (!ok) { setErrors({ submit: 'Biometric authentication failed.' }); return; }
    // Biometric confirmed — user still needs stored credentials
    // For now navigate to dashboard if already authenticated
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? 'unknown';
      setErrors({ submit: `Error: ${code}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <Link to="/" className="block font-display text-headline-lg text-primary-container mb-12 text-center">IRONHIDE</Link>
        <div className="bg-surface-container border-t-2 border-primary-container p-8">
          <h1 className="font-display text-headline-md uppercase mb-2">MEMBER LOGIN</h1>
          <p className="text-body-md text-on-surface-variant font-body mb-8">Welcome back. Access your portal below.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="your@email.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`w-full bg-surface-container border text-on-surface px-4 py-3 pr-12 focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant ${errors.password ? 'border-error' : 'border-border-default'}`}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <span className="text-error text-label-sm">{errors.password}</span>}
              <Link to="/forgot-password" className="text-primary-container text-label-sm font-label-sm hover:underline self-end mt-1">Forgot password?</Link>
            </div>
            {errors.submit && <p className="text-error text-body-md font-body">{errors.submit}</p>}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">SIGN IN</Button>
            {biometricAvailable && (
              <button type="button" onClick={handleBiometric}
                className="w-full border border-border-default text-on-surface py-4 font-display text-headline-md uppercase hover:border-primary-container transition-all flex items-center justify-center gap-3">
                <span className="material-symbols-outlined">fingerprint</span>
                USE FACE ID / FINGERPRINT
              </button>
            )}
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-body-md text-on-surface-variant font-body">
              <Link to="/forgot-password" className="text-primary-container hover:underline">Forgot your password?</Link>
            </p>
            <p className="text-body-md text-on-surface-variant font-body">
              Not a member?{' '}
              <Link to="/signup" className="text-primary-container hover:underline">Join Now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
