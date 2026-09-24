import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { clearHnbSession } from '../lib/hnbipg';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

interface PaymentResultPageProps {
  success: boolean;
}

export default function PaymentResultPage({ success }: PaymentResultPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activating, setActivating] = useState(success);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!success || !user) return;

    const checkActivation = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'members', user.uid));
        if (snapshot.data()?.membershipStatus === 'active') {
          clearInterval(pollRef.current!);
          clearTimeout(timeoutRef.current!);
          clearHnbSession();
          navigate('/dashboard', { replace: true, state: { stripeActivated: false } });
        }
      } catch (error) {
        console.error('[PaymentResultPage] Activation check failed:', error);
      }
    };

    checkActivation();
    pollRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!);
      setActivating(false);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);

    return () => {
      clearInterval(pollRef.current!);
      clearTimeout(timeoutRef.current!);
    };
  }, [navigate, success, user]);

  if (!success) {
    return (
      <ResultLayout>
        <span className="material-symbols-outlined text-error text-6xl">error</span>
        <h1 className="font-display text-headline-lg uppercase">Payment Unsuccessful</h1>
        <p className="font-body text-body-lg text-on-surface-variant">
          Your payment was not completed. No membership was activated and no successful charge was recorded.
        </p>
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/renew')}>
          TRY PAYMENT AGAIN
        </Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
          RETURN TO DASHBOARD
        </Button>
      </ResultLayout>
    );
  }

  return (
    <ResultLayout>
      <span className="material-symbols-outlined text-green-400 text-6xl">check_circle</span>
      <h1 className="font-display text-headline-lg uppercase">Payment Successful</h1>
      {activating && !timedOut ? (
        <>
          <p className="font-body text-body-lg text-on-surface-variant">
            Your payment was received. Activating your membership now.
          </p>
          <div className="mx-auto h-8 w-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
        </>
      ) : (
        <>
          <p className="font-body text-body-lg text-on-surface-variant">
            Your payment was received. Membership activation is taking longer than expected.
          </p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
            GO TO DASHBOARD
          </Button>
        </>
      )}
    </ResultLayout>
  );
}

function ResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="font-display text-headline-lg text-primary-container mb-12">IRONHIDE FITNESS</div>
        <div className="bg-surface-container border-t-2 border-primary-container p-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
