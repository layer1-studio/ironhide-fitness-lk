import { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
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
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      ) : payments.length === 0 ? (
        <p className="text-body-lg text-on-surface-variant font-body">No payment records found.</p>
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
