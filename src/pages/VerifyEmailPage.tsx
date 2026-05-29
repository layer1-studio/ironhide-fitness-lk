import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, reload, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    setError('');
    try {
      await sendEmailVerification(user);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      setError('Could not resend. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!user) return;
    setChecking(true);
    setError('');
    try {
      await reload(user);
      if (user.emailVerified) {
        navigate('/dashboard');
      } else {
        setError('Email not yet verified. Please check your inbox and click the link.');
      }
    } catch {
      setError('Could not check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="font-display text-headline-lg text-primary-container mb-12">IRONHIDE</div>
        <div className="bg-surface-container border-t-2 border-primary-container p-8 space-y-6">
          <div className="flex justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="font-display text-headline-lg uppercase">Verify Your Email</h1>
          <p className="font-body text-body-lg text-on-surface-variant">
            We've sent a verification link to<br />
            <span className="text-on-surface font-bold">{user?.email}</span>
          </p>
          <p className="font-body text-body-md text-on-surface-variant">
            Click the link in the email to activate your account, then press the button below. If you don't see it, <span className="text-on-surface font-bold">check your spam or junk folder</span>.
          </p>

          {error && <p className="text-error text-body-md font-body">{error}</p>}
          {resent && <p className="text-green-400 text-body-md font-body">Verification email resent.</p>}

          <div className="space-y-3">
            <Button variant="primary" size="lg" className="w-full" loading={checking} onClick={handleCheckVerified}>
              I'VE VERIFIED MY EMAIL
            </Button>
            <Button variant="ghost" size="lg" className="w-full" loading={resending} onClick={handleResend}>
              Resend Email
            </Button>
            <button onClick={handleSignOut} className="text-on-surface-variant hover:text-on-surface text-body-md font-body transition-colors w-full">
              Sign in with different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
