import { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Badge } from '../components/ui/Badge';
import { getPayments } from '../lib/memberService';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatCurrency } from '../lib/utils';
import type { Payment } from '../types';

function PaymentsContent() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPayments(user.uid).then(setPayments).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">PAYMENT HISTORY</h1>
      <div className="w-24 h-1 bg-primary-container mb-12" />

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
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant opacity-40"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <h3 className="font-display text-headline-md uppercase">No Payments Yet</h3>
          <p className="text-body-lg text-on-surface-variant font-body max-w-sm">Your payment history will appear here once your membership is activated.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map(p => (
            <div key={p.id} className="bg-surface-container border-l-4 border-primary-container p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-display text-headline-md">{p.plan}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{p.method.replace('_', ' ')} · {formatDate(p.createdAt)}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-display text-headline-md text-primary-container">{formatCurrency(p.amount)}</span>
                <Badge status={p.status} />
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
