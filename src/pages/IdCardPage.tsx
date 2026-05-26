import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { useMember } from '../hooks/useMember';
import { formatDate } from '../lib/utils';

// Simple QR code using a free API
function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1a1a1a&color=ffffff&margin=8`}
      alt="Member QR Code"
      width={size}
      height={size}
      className="border-2 border-border-default"
    />
  );
}

function IdCardContent() {
  const { member, loading } = useMember();

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (!member) return <div className="text-center py-24 text-on-surface-variant font-body">Member data unavailable.</div>;

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">DIGITAL GYM ID</h1>
      <div className="w-24 h-1 bg-primary-container mb-12" />

      <div className="flex flex-col items-center">
        {/* Card */}
        <div className="w-full max-w-md bg-surface-container border-2 border-primary-container relative overflow-hidden" style={{ boxShadow: '0 0 30px rgba(204,0,0,0.2)' }}>
          {/* Card Header */}
          <div className="bg-primary-container px-6 py-4 flex justify-between items-center">
            <span className="font-display text-headline-md text-on-primary-container uppercase tracking-widest">IRONHIDE</span>
            <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-widest">FITNESS</span>
          </div>

          {/* Card Body */}
          <div className="p-6 flex gap-6">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 border-2 border-primary-container overflow-hidden">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">person</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
              <h2 className="font-display text-headline-md uppercase truncate">{member.fullName}</h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">{member.membershipTier || 'Member'}</p>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase w-16">DOB</span>
                  <span className="font-label-sm text-label-sm">{formatDate(member.dob)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase w-16">ID</span>
                  <span className="font-label-sm text-label-sm font-mono">{member.uid.slice(0, 12).toUpperCase()}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase w-16">Locker</span>
                  <span className="font-label-sm text-label-sm">{member.lockerNumber || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR + Status */}
          <div className="border-t border-border-default px-6 py-4 flex justify-between items-end">
            <div className="space-y-2">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Status</p>
                <Badge status={member.membershipStatus} />
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Expires</p>
                <p className="font-label-sm text-label-sm">{formatDate(member.membershipExpiry)}</p>
              </div>
            </div>
            <QRCode value={`IRONHIDE:${member.uid}`} size={100} />
          </div>

          {/* Decorative bg text */}
          <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none select-none">
            <span className="font-display text-[80px] text-on-surface">IH</span>
          </div>
        </div>

        <p className="mt-6 font-label-sm text-label-sm text-on-surface-variant text-center uppercase tracking-widest max-w-sm">
          Present this card at reception or scan the QR code at the entry terminal
        </p>
        <Link to="/dashboard" className="mt-6 font-label-sm text-label-sm text-primary-container hover:underline uppercase">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default function IdCardPage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <IdCardContent />
      </PageWrapper>
    </AuthGuard>
  );
}
