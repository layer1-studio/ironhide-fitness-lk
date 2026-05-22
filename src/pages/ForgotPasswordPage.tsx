import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      setError('Failed to send reset email. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <Link to="/" className="block font-display text-headline-lg text-primary-container mb-12 text-center">IRONHIDE</Link>
        <div className="bg-surface-container border-t-2 border-primary-container p-8">
          <h1 className="font-display text-headline-md uppercase mb-2">RESET PASSWORD</h1>
          <p className="text-body-md text-on-surface-variant font-body mb-8">Enter your email and we'll send you a reset link.</p>
          {sent ? (
            <div className="border border-green-500 text-green-400 p-6 font-body text-body-md">
              Reset link sent! Check your email inbox.
              <div className="mt-4">
                <Link to="/login" className="text-primary-container hover:underline">Back to Login</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} error={error} placeholder="your@email.com" />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">SEND RESET LINK</Button>
              <p className="text-center text-body-md text-on-surface-variant font-body">
                <Link to="/login" className="text-primary-container hover:underline">Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
