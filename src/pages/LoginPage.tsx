import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
    } catch {
      setErrors({ submit: 'Invalid email or password. Please try again.' });
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
            <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="your@email.com" />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} error={errors.password} placeholder="••••••••" />
            {errors.submit && <p className="text-error text-body-md font-body">{errors.submit}</p>}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">SIGN IN</Button>
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
