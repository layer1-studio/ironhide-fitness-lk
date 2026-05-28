import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { useMember } from '../hooks/useMember';
import { formatDate } from '../lib/utils';
import { useEffect, useState } from 'react';
import { getNotifications } from '../lib/memberService';
import { useAuth } from '../hooks/useAuth';
import { registerFCMToken } from '../lib/notifications';
import type { Notification } from '../types';

function DashboardContent() {
  const { member, loading } = useMember();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid).then(n => setNotifications(n.slice(0, 5))).catch(() => {});
    registerFCMToken(user.uid).catch(() => {});
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <div className="mb-12">
        <h1 className="font-display text-headline-lg uppercase mb-2" style={{ textShadow: '0 0 15px rgba(204,0,0,0.4)' }}>
          Welcome Back{member ? `, ${member.fullName.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-body-lg text-on-surface-variant font-body">The grind never stops. Your performance summary is below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Status Card */}
        <div className="md:col-span-8 bg-surface-container border-t-2 border-primary-container p-8 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="font-display text-[120px] leading-none uppercase select-none">CHAMPION</span>
          </div>
          <div className="w-48 h-48 flex-shrink-0 border-4 border-primary-container overflow-hidden" style={{ boxShadow: '0 0 10px #cc0000' }}>
            {member?.photoUrl ? (
              <img src={member.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-6xl">person</span>
              </div>
            )}
          </div>
          <div className="flex-grow space-y-4 z-10 text-center md:text-left">
            <div>
              <span className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Membership Tier</span>
              <h2 className="font-display text-headline-md uppercase">{member?.membershipTier || 'Member'}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Member Since</p>
                <p className="font-display text-headline-md leading-tight">{member?.createdAt ? formatDate(member.createdAt) : '—'}</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Status</p>
                {member?.membershipStatus ? (
                  <Badge status={member.membershipStatus} />
                ) : <span className="font-display text-headline-md">—</span>}
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Locker No.</p>
                <p className="font-display text-headline-md leading-tight">{member?.lockerNumber || '—'}</p>
              </div>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Membership Expires</p>
              <p className="font-display text-headline-md">{member?.membershipExpiry ? formatDate(member.membershipExpiry) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="md:col-span-4 bg-surface-container border-t-2 border-primary-container p-6">
          <h3 className="font-display text-headline-md uppercase mb-6">Action Center</h3>
          <div className="flex flex-col gap-3">
            <Link to="/renew" className="w-full bg-primary-container text-on-primary-container font-display text-[20px] py-4 uppercase hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">refresh</span>
              Renew Membership
            </Link>
            <Link to="/payments" className="w-full border border-surface-container-highest text-on-surface font-display text-[20px] py-4 uppercase hover:bg-surface-container-high transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">payments</span>
              Payment History
            </Link>
            <Link to="/profile" className="w-full border border-surface-container-highest text-on-surface font-display text-[20px] py-4 uppercase hover:bg-surface-container-high transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">person</span>
              Edit Profile
            </Link>
            <Link to="/id-card" className="w-full border border-surface-container-highest text-on-surface font-display text-[20px] py-4 uppercase hover:bg-surface-container-high transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">badge</span>
              My Gym ID
            </Link>
            <Link to="/fitness" className="w-full border border-surface-container-highest text-on-surface font-display text-[20px] py-4 uppercase hover:bg-surface-container-high transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">fitness_center</span>
              Fitness Log
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <div className="md:col-span-12 bg-surface-container border-t-2 border-primary-container p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-display text-headline-md uppercase">Notifications</h4>
            <Link to="/announcements" className="font-label-sm text-label-sm text-primary-container hover:underline uppercase">View All</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-body-md text-on-surface-variant font-body">No new notifications.</p>
          ) : (
            <div className="space-y-4">
              {notifications.map(n => (
                <div key={n.id} className="flex gap-4 p-4 bg-surface-container-high border-l-4 border-primary-container items-start">
                  <span className="material-symbols-outlined text-primary-container">info</span>
                  <div>
                    <p className="font-label-sm text-label-sm uppercase text-primary-container mb-1">{n.type}</p>
                    <p className="font-body text-body-md">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <DashboardContent />
      </PageWrapper>
    </AuthGuard>
  );
}
