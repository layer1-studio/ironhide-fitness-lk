import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendEmailVerification, reload, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth , db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { clearHnbSession } from '../lib/hnbipg';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes max
export default function VerifyEmailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { coupleLinkId } = (location.state as { coupleLinkId?: string }) ?? {};
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'hnb' | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  const [activating, setActivating] = useState(false);
  const [activationTimedOut, setActivationTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Check for Stripe or HNB return status from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stripeStatus = params.get('stripe');
    const hnbStatus = params.get('hnb');
    const provider = stripeStatus ? 'stripe' : hnbStatus ? 'hnb' : null;
    const status = stripeStatus ?? hnbStatus;
    if (status === 'success' || status === 'cancelled') {
      setPaymentProvider(provider);
      setPaymentStatus(status as 'success' | 'cancelled');
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      url.searchParams.delete('hnb');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [location.search]);

    // Start polling Firestore after a successful Stripe or HNB payment.
  useEffect(() => {
    if (paymentStatus !== 'success' || !user) return;

    console.log(`[VerifyEmailPage] Starting ${paymentProvider} membership activation polling for uid:`, user.uid);
    setActivating(true);

    const checkActivation = async () => {
      try {
        const snap = await getDoc(doc(db, 'members', user.uid));
        if (snap.exists()) {
          const memberData = snap.data();
          console.log('[VerifyEmailPage] Member data:', { membershipStatus: memberData?.membershipStatus, uid: user.uid });
          
          if (memberData?.membershipStatus === 'active') {
            console.log('[VerifyEmailPage] Membership activated! Redirecting to dashboard...');
            clearInterval(pollRef.current!);
            clearTimeout(timeoutRef.current!);
            if (paymentProvider === 'hnb') clearHnbSession();
            // Small delay so user sees the "activated" state briefly
            setTimeout(() => {
              navigate('/dashboard', { state: { stripeActivated: paymentProvider === 'stripe' } });
            }, 800);
          }
        } else {
          console.warn('[VerifyEmailPage] Member document does not exist:', user.uid);
        }
      } catch (err) {
        console.error('[VerifyEmailPage] Error checking activation:', err);
        // non-fatal, keep polling
      }
    };

    // Check immediately, then on interval
    checkActivation();
    pollRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);

    // Stop polling after 2 minutes and show fallback message
    timeoutRef.current = setTimeout(() => {
      console.warn('[VerifyEmailPage] Polling timeout - membership not activated within 2 minutes');
      clearInterval(pollRef.current!);
      setActivating(false);
      setActivationTimedOut(true);
    }, POLL_TIMEOUT_MS);

    return () => {
      clearInterval(pollRef.current!);
      clearTimeout(timeoutRef.current!);
    };
  }, [paymentProvider, paymentStatus, user, navigate]);

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
        <div className="font-display text-headline-lg text-primary-container mb-12">IRONHIDE FITNESS</div>
        
        {/* Stripe Payment Return Banner */}
        {paymentStatus === 'success' && bannerVisible && (
          <div className="mb-8 border border-green-500 bg-green-500/10 p-4 flex items-start gap-3 relative">
            <span className="material-symbols-outlined text-green-400 text-2xl shrink-0">check_circle</span>
            <div className="flex-1 text-left">
              <p className="font-display text-body-lg uppercase text-green-400">{paymentProvider === 'hnb' ? 'HNB Payment Successful ✓' : 'Payment Successful ✓'}</p>
              {activating ? (
                <p className="font-body text-body-md text-on-surface-variant mt-1">
                  Activating your membership… you'll be redirected automatically.
                </p>
              ) : activationTimedOut ? (
                <p className="font-body text-body-md text-on-surface-variant mt-1">
                  Payment confirmed. Your membership is being activated — check your dashboard in a moment.
                </p>
              ) : (
                <p className="font-body text-body-md text-on-surface-variant mt-1">
                  Your card payment has been received. Your membership will be activated shortly.
                </p>
              )}
            </div>
            {!activating && (
              <button
                onClick={() => setBannerVisible(false)}
                className="text-on-surface-variant hover:text-on-surface shrink-0"
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        )}

        {/* Activating spinner (shown below banner when polling) */}
        {paymentStatus === 'success' && activating && (
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            <p className="font-body text-body-md text-on-surface-variant">
              Waiting for payment confirmation…
            </p>
          </div>
        )}

        {/* Go to dashboard button shown after timeout */}
        {activationTimedOut && (
          <div className="mb-6">
            <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
              GO TO DASHBOARD
            </Button>
          </div>
        )}


        {paymentStatus === 'cancelled' && bannerVisible && paymentProvider === 'stripe' && (
          <div className="mb-8 border border-yellow-500 bg-yellow-500/10 p-4 flex items-start gap-3 rounded relative">
            <span className="material-symbols-outlined text-yellow-400 text-2xl shrink-0">info</span>
            <div className="flex-1 text-left">
              <p className="font-display text-body-lg uppercase text-yellow-400">Payment Cancelled</p>
              <p className="font-body text-body-md text-on-surface-variant mt-1">
                Your payment was not completed. No charge has been made. You can try again from the Renew page.
              </p>
            </div>
            <button
              onClick={() => setBannerVisible(false)}
              className="text-on-surface-variant hover:text-on-surface shrink-0"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}
        
        <div className="bg-surface-container border-t-2 border-primary-container p-8 space-y-6">
          <div className="flex justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="font-display text-headline-lg uppercase">
            {paymentStatus === 'success' ? 'Payment Received' : 'Verify Your Email'}
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant">
            {paymentStatus === 'success'
              ? 'Your payment was received. We are confirming your membership now.'
              : "We've sent a verification link to"}
            {paymentStatus !== 'success' && <><br />
            </>}
            <span className="text-on-surface font-bold">{user?.email}</span>
          </p>
          {paymentStatus !== 'success' && (
            <p className="font-body text-body-md text-on-surface-variant">
              Click the link in the email to activate your account, then press the button below. If you don't see it, <span className="text-on-surface font-bold">check your spam or junk folder</span>.
            </p>
          )}

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

          {coupleLinkId && (
            <div className="bg-surface-container-high border border-border-default p-4 space-y-2 text-left">
              <p className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Annual Couple — Partner Invite</p>
              <p className="font-body text-body-md text-on-surface-variant">Share this link with your partner to create their linked account:</p>
              <p className="font-body text-body-md text-on-surface break-all select-all">
                {window.location.origin}/signup?coupleLink={coupleLinkId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
