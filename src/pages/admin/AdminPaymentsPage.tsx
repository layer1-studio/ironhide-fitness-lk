import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { subscribeAllPayments, setPaymentStatus, type AdminPayment } from '../../lib/memberService';
import { formatDate, formatCurrency } from '../../lib/utils';

type TabKey = 'all' | 'pending' | 'card' | 'approved' | 'rejected';

const methodMeta: Record<AdminPayment['method'], { label: string; icon: string }> = {
  card: { label: 'Card Payment', icon: 'credit_card' },
  bank_transfer: { label: 'Bank Transfer', icon: 'account_balance' },
  hnb_ipg: { label: 'Bank payment', icon: 'account_balance' },
  cash: { label: 'Cash at Gym', icon: 'payments' },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function StatCard({ label, value, sub, icon, highlight }: { label: string; value: string; sub: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-[24px] border shadow-lg ${highlight ? 'bg-primary-container border-primary-container text-on-primary-container shadow-primary-container/20' : 'bg-surface-container border-surface-container-highest shadow-black/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-label-sm uppercase tracking-[0.24em] ${highlight ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>{label}</p>
          <p className={`font-display text-headline-md mt-4 ${highlight ? 'text-on-primary-container' : 'text-on-surface'}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-3xl ${highlight ? 'bg-on-primary-container/10 text-on-primary-container' : 'bg-surface-container-highest border border-surface-container-highest text-on-surface-variant'}`}>
          <span className="material-symbols-outlined text-base">{icon}</span>
        </div>
      </div>
      <p className={`text-body-sm font-body mt-3 ${highlight ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>{sub}</p>
    </div>
  );
}

function PaymentDetailModal({ payment, onClose, onUpdated }: { payment: AdminPayment; onClose: () => void; onUpdated: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | 'markPaid' | null>(null);
  const [error, setError] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const methodDisplay = methodMeta[payment.method as keyof typeof methodMeta] ?? methodMeta.card;

  const act = async (status: 'confirmed' | 'rejected', which: 'approve' | 'reject' | 'markPaid', note?: string) => {
    setBusy(which);
    setError('');
    try {
      await setPaymentStatus(payment.memberUid, payment.id, status, note);
      onUpdated();
      onClose();
    } catch {
      setError('Action failed. Please try again.');
      setBusy(null);
    }
  };

  const confirmReject = () => {
    const trimmed = rejectionNote.trim();
    if (!trimmed) return;
    void act('rejected', 'reject', trimmed);
  };

  const isPendingBank = payment.method === 'bank_transfer' && payment.status === 'pending_verification';
  const isPendingCash = payment.method === 'cash' && payment.status === 'pending_cash';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-high max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-headline-md uppercase">{payment.memberName}</h3>
            <p className="text-body-sm text-on-surface-variant font-body">{payment.memberEmail}</p>
            {payment.memberSecondaryEmail && (
              <p className="text-body-sm text-on-surface-variant font-body">{payment.memberSecondaryEmail}</p>
            )}
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-body-sm font-body">
          <div>
            <span className="block text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Plan</span>
            <span className="font-display text-headline-sm">{payment.plan}</span>
          </div>
          <div>
            <span className="block text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Amount</span>
            <span className="font-display text-headline-sm text-primary-container">{formatCurrency(payment.amount)}</span>
          </div>
          <div>
            <span className="block text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Method</span>
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">{methodDisplay.icon}</span>{methodDisplay.label}</span>
          </div>
          <div>
            <span className="block text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Status</span>
            <Badge status={payment.status} />
          </div>
        </div>

        {payment.method === 'bank_transfer' && payment.receiptUrl && (
          <div>
            <span className="block text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">Uploaded Receipt</span>
            <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
              <img src={payment.receiptUrl} alt="Payment receipt" className="w-full max-h-80 object-contain bg-surface border border-border-default" />
            </a>
          </div>
        )}

        {error && <p className="text-error text-body-sm font-body">{error}</p>}

        {showRejectForm ? (
          <div className="space-y-3">
            <label className="block text-label-sm text-on-surface-variant uppercase tracking-widest">
              Reason for rejection
            </label>
            <textarea
              className="w-full border border-border-default bg-surface p-3 text-body-sm font-body"
              rows={4}
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="e.g. Bank reference number doesn't match our records"
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" loading={busy === 'reject'} disabled={!!busy || !rejectionNote.trim()} onClick={confirmReject}>
                Confirm Rejection
              </Button>
              <Button variant="ghost" className="flex-1" disabled={!!busy} onClick={() => { setShowRejectForm(false); setRejectionNote(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 pt-2">
            {isPendingBank && (
              <>
                <Button variant="primary" className="flex-1" loading={busy === 'approve'} disabled={!!busy} onClick={() => act('confirmed', 'approve')}>
                  Approve
                </Button>
                <Button variant="secondary" className="flex-1" disabled={!!busy} onClick={() => setShowRejectForm(true)}>
                  Reject
                </Button>
              </>
            )}
            {isPendingCash && (
              <Button variant="primary" className="flex-1" loading={busy === 'markPaid'} disabled={!!busy} onClick={() => act('confirmed', 'markPaid')}>
                Mark as Paid
              </Button>
            )}
            {!isPendingBank && !isPendingCash && (
              <Button variant="ghost" className="flex-1" onClick={onClose}>Close</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPaymentsContent() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsub = subscribeAllPayments(data => { setPayments(data); setLoading(false); });
    return unsub;
  }, [refreshKey]);

  const stats = useMemo(() => {
    const now = new Date();
    const pending = payments.filter(p => p.status === 'pending_verification' || p.status === 'pending_cash');
    const cardActive = payments.filter(p => p.method === 'card' && p.status === 'confirmed');
    const approvedThisMonth = payments.filter(p => {
      const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      return p.status === 'confirmed' && p.method !== 'card' &&
        createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });
    const revenue = payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);
    return { pending, cardActive, approvedThisMonth, revenue };
  }, [payments]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: payments.length },
    { key: 'pending', label: 'Pending', count: stats.pending.length },
    { key: 'card', label: 'Card Active', count: stats.cardActive.length },
    { key: 'approved', label: 'Approved', count: payments.filter(p => p.status === 'confirmed' && p.method !== 'card').length },
    { key: 'rejected', label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length },
  ];

  const filtered = payments.filter(p => {
    const matchesTab =
      tab === 'all' ? true :
      tab === 'pending' ? (p.status === 'pending_verification' || p.status === 'pending_cash') :
      tab === 'card' ? (p.method === 'card' && p.status === 'confirmed') :
      tab === 'approved' ? (p.status === 'confirmed' && p.method !== 'card') :
      p.status === 'rejected';
    if (!matchesTab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const memberName = (p.memberName || '').toLowerCase();
    const memberEmail = (p.memberEmail || '').toLowerCase();
    const memberSecondaryEmail = (p.memberSecondaryEmail || '').toLowerCase();
    const paymentId = (p.id || '').toLowerCase();
    return memberName.includes(q) || memberEmail.includes(q) || memberSecondaryEmail.includes(q) || paymentId.includes(q);
  });

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-8">
      <div>
        <h1 className="font-display text-headline-lg uppercase mb-4">PAYMENT MANAGEMENT</h1>
        <div className="w-24 h-1 bg-primary-container" />
        <p className="mt-4 max-w-2xl text-body-md text-on-surface-variant font-body">
          Review card payments, inspect bank transfer receipts, and mark cash-at-gym payments as paid from one place.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={String(stats.pending.length)} sub="Needs action" icon="priority_high" highlight />
        <StatCard label="Approved" value={String(stats.approvedThisMonth.length)} sub="This month" icon="check_circle" />
        <StatCard label="Card Active" value={String(stats.cardActive.length)} sub="Auto-activated" icon="credit_card" />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} sub="Active + Approved" icon="trending_up" />
      </div>

      <div className="flex flex-wrap gap-6 border-b border-border-default pb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 font-display uppercase tracking-wider pb-2 border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-container text-primary-container' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
            <span className={`text-label-sm px-2 py-0.5 rounded-full ${tab === t.key ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <Input
        placeholder="Search by name, ID, or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-40">inbox</span>
          <p className="text-body-lg text-on-surface-variant font-body">No payments match this view.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest border-b border-border-default">
                <th className="py-3 pr-4">Payment ID</th>
                <th className="py-3 pr-4">Member</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Method</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Submitted</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const methodDisplay = methodMeta[p.method as keyof typeof methodMeta] ?? methodMeta.card;
                return (
                  <tr key={p.id} className="border-b border-border-default/50 hover:bg-surface-container/50">
                    <td className="py-4 pr-4 font-body text-body-sm text-on-surface-variant">PAY-{String(p.id || '').slice(0, 4).toUpperCase()}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-container/20 text-primary-container font-display text-sm shrink-0">
                          {initials(String(p.memberName || 'Unknown Member'))}
                        </span>
                        <div>
                          <div className="font-display text-body-md">{p.memberName || 'Unknown Member'}</div>
                          <div className="text-label-sm text-on-surface-variant font-body">
                            {p.memberEmail || 'No email'}
                            {p.memberSecondaryEmail ? ` · ${p.memberSecondaryEmail}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-body text-body-sm">{p.plan}</td>
                    <td className="py-4 pr-4 font-display text-body-md">{formatCurrency(p.amount)}</td>
                    <td className="py-4 pr-4">
                      <span className="flex items-center gap-2 text-body-sm font-body border border-border-default px-3 py-1.5 w-fit">
                        <span className="material-symbols-outlined text-base">{methodDisplay.icon}</span>
                        {methodDisplay.label}
                      </span>
                    </td>
                    <td className="py-4 pr-4"><Badge status={p.status} /></td>
                    <td className="py-4 pr-4 text-body-sm text-on-surface-variant font-body">{formatDate(p.createdAt)}</td>
                    <td className="py-4 pr-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(p)}>
                        <span className="material-symbols-outlined text-base">visibility</span>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <PaymentDetailModal
          payment={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setRefreshKey(value => value + 1)}
        />
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return <AdminPaymentsContent />;
}