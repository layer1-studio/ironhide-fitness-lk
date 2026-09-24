import { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Badge } from '../components/ui/Badge';
import { addPayment, getPayments, resolvePaymentOwnerUid } from '../lib/memberService';
import { getStripeReturnStatus, clearStripeSession } from '../lib/stripe';
import { getHnbReturnStatus, clearHnbSession } from '../lib/hnbipg';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatCurrency } from '../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import type { Payment } from '../types';

function StripeReturnBanner() {
  const status = getStripeReturnStatus();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (status) {
      clearStripeSession();
      // Remove query params from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [status]);

  if (!status || !visible) return null;

  if (status === 'success') {
    return (
      <div className="mb-8 border border-green-500 bg-green-500/10 p-4 flex items-start gap-3 relative">
        <span className="material-symbols-outlined text-green-400 text-2xl shrink-0">check_circle</span>
        <div>
          <p className="font-display text-body-lg uppercase text-green-400">Payment Successful</p>
          <p className="font-body text-body-md text-on-surface-variant">
            Your card payment has been received. Your membership is being activated — this may take a few moments.
            You'll receive a notification once it's confirmed.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 border border-yellow-500 bg-yellow-500/10 p-4 flex items-start gap-3 relative">
      <span className="material-symbols-outlined text-yellow-400 text-2xl shrink-0">info</span>
      <div>
        <p className="font-display text-body-lg uppercase text-yellow-400">Payment Cancelled</p>
        <p className="font-body text-body-md text-on-surface-variant">
          Your payment was not completed. No charge has been made. You can try again from the Renew page.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

function HnbReturnBanner() {
  const status = getHnbReturnStatus();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (status) {
      clearHnbSession();
      const url = new URL(window.location.href);
      url.searchParams.delete('hnb');
      window.history.replaceState({}, '', url.toString());
    }
  }, [status]);

  if (!status || !visible) return null;

  if (status === 'success') {
    return (
      <div className="mb-8 border border-green-500 bg-green-500/10 p-4 flex items-start gap-3 relative">
        <span className="material-symbols-outlined text-green-400 text-2xl shrink-0">check_circle</span>
        <div>
          <p className="font-display text-body-lg uppercase text-green-400">Payment Successful</p>
          <p className="font-body text-body-md text-on-surface-variant">
            Your HNB card payment has been received. Your membership is being activated — this may take a few moments.
            You'll receive a notification once it's confirmed.
          </p>
          </div>
        <button onClick={() => setVisible(false)} className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface" aria-label="Dismiss">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 border border-yellow-500 bg-yellow-500/10 p-4 flex items-start gap-3 relative">
      <span className="material-symbols-outlined text-yellow-400 text-2xl shrink-0">info</span>
      <div>
        <p className="font-display text-body-lg uppercase text-yellow-400">
          Payment {status === 'failed' ? 'Failed' : 'Cancelled'}
        </p>
        <p className="font-body text-body-md text-on-surface-variant">
          {status === 'failed'
            ? 'Your HNB card payment was declined. Please try another payment method or contact your bank.'
            : 'Your HNB payment was not completed. No charge has been made. You can try again from the Renew page.'}
        </p>
      </div>
      <button onClick={() => setVisible(false)} className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface" aria-label="Dismiss">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

function PaymentsContent() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!user) return;
    getPayments(user.uid).then(setPayments).finally(() => setLoading(false));
  }, [user]);

  const handleReupload = async (payment: Payment, file: File | null) => {
    if (!user || !file) return;

    setUploadingPaymentId(payment.id);
    setUploadMessage('');
    setUploadError('');

    try {
      const receiptRef = ref(storage, `members/${user.uid}/receipts/${payment.id}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`);
      await uploadBytes(receiptRef, file);
      const receiptUrl = await getDownloadURL(receiptRef);
      const nextStatus = payment.method === 'cash' ? 'pending_cash' : 'pending_verification';

      const ownerUid = await resolvePaymentOwnerUid(user.uid);
      const newPaymentId = await addPayment(user.uid, {
        amount: payment.amount,
        plan: payment.plan,
        method: payment.method,
        status: nextStatus,
        receiptUrl,
      });

      await updateDoc(doc(db, 'members', ownerUid), {
        membershipStatus: nextStatus,
      });

      setPayments(current => [
        { id: newPaymentId, amount: payment.amount, plan: payment.plan, method: payment.method, status: nextStatus, receiptUrl, createdAt: new Date() },
        ...current,
      ]);
      setUploadMessage('Your new proof has been submitted for review.');
    } catch (err: any) {
      console.error('[PaymentsPage] reupload error:', err);
      setUploadError(err?.message || 'Could not upload your proof. Please try again.');
    } finally {
      setUploadingPaymentId(null);
    }
  };

  const latestRejectedPayment = payments.find(
    (payment) => payment.status === 'rejected'
  );

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">PAYMENT HISTORY</h1>
      <div className="w-24 h-1 bg-primary-container mb-12" />

      <StripeReturnBanner />
      <HnbReturnBanner />

      {uploadMessage && (
        <div className="mb-6 border border-green-500 bg-green-500/10 p-4">
          <p className="text-green-400 font-body text-body-md">{uploadMessage}</p>
        </div>
      )}

      {uploadError && (
        <div className="mb-6 border border-error bg-error/10 p-4">
          <p className="text-error font-body text-body-md">{uploadError}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container p-6 flex justify-between items-center animate-pulse">
              <div className="space-y-2">
                <div className="h-6 w-32 bg-surface-container-high" />
                <div className="h-4 w-48 bg-surface-container-high" />
              </div>
              <div className="flex items-center gap-6">
                <div className="h-6 w-28 bg-surface-container-high" />
                <div className="h-6 w-20 bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant opacity-40">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <h3 className="font-display text-headline-md uppercase">No Payments Yet</h3>
          <p className="text-body-lg text-on-surface-variant font-body max-w-sm">
            Your payment history will appear here once your membership is activated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map(p => (
            <div
              key={p.id}
              className="bg-surface-container border-l-4 border-primary-container p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1">
                <span className="font-display text-headline-md">{p.plan}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {p.method === 'card' ? 'Card (Stripe)'
                  : p.method === 'hnb_ipg'
                    ? 'Card (HNB IPG)' 
                    : p.method.replace('_', ' ')} · {formatDate(p.createdAt)}
                </span>
                {/* Show Stripe session ID for card payments as a subtle reference */}
                {p.method === 'card' && (p as Payment & { stripeSessionId?: string }).stripeSessionId && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant opacity-50 font-mono text-xs">
                    ref: {(p as Payment & { stripeSessionId?: string }).stripeSessionId?.slice(0, 20)}…
                  </span>
                )}
                {/* Show HNB transaction ID */}
                {p.method === 'hnb_ipg' && (p as Payment & { hnbTransactionId?: string }).hnbTransactionId && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant opacity-50 font-mono text-xs">
                    txn: {(p as Payment & { hnbTransactionId?: string }).hnbTransactionId?.slice(0, 20)}…
                  </span>
                )}
              </div>

              <div className="flex flex-col md:items-end gap-4">
                <div className="flex items-center gap-6">
                  <span className="font-display text-headline-md text-primary-container">
                    {formatCurrency(p.amount)}
                  </span>
                  <Badge status={p.status} />
                </div>

                {p.status === 'rejected' && p.id === latestRejectedPayment?.id && (
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <p className="font-body text-body-sm text-on-surface-variant">
                      Your previous proof was rejected. Upload a fresh photo to submit it again.
                    </p>
                    <label className="inline-flex cursor-pointer items-center gap-2 border border-border-default bg-surface px-4 py-2 transition-all hover:border-primary-container">
                      <span className="material-symbols-outlined text-primary-container text-lg">upload</span>
                      <span className="font-body text-body-md">
                        {uploadingPaymentId === p.id ? 'Uploading...' : 'Upload New Proof'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.currentTarget.value = '';
                          void handleReupload(p, file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <PaymentsContent />
      </PageWrapper>
    </AuthGuard>
  );
}