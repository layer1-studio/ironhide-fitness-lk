import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PageWrapper } from '../components/layout/PageWrapper';
import { formatDate } from '../lib/utils';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'alert' | 'promo';
  createdAt: Date;
}

const typeConfig = {
  info: { icon: 'info', color: 'text-primary-container border-primary-container' },
  alert: { icon: 'warning', color: 'text-yellow-400 border-yellow-400' },
  promo: { icon: 'local_offer', color: 'text-green-400 border-green-400' },
};

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')))
      .then(snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }) as Announcement)))
      .catch(() => setItems([
        { id: '1', title: 'Welcome to IronHide', body: 'The gym app is now live. Sign up to access your digital membership card and track your workouts.', type: 'info', createdAt: new Date() },
        { id: '2', title: 'New Equipment Arriving', body: 'Hammer Strength plate-loaded machines arriving this Friday. Power rack zone closed for 2 hours during installation.', type: 'alert', createdAt: new Date() },
      ]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg uppercase mb-4">ANNOUNCEMENTS</h1>
        <div className="w-24 h-1 bg-primary-container mb-12" />
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-container p-6 space-y-3 animate-pulse">
                <div className="flex justify-between"><div className="h-6 w-48 bg-surface-container-high" /><div className="h-4 w-24 bg-surface-container-high" /></div>
                <div className="h-4 w-full bg-surface-container-high" />
                <div className="h-4 w-3/4 bg-surface-container-high" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant opacity-40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <h3 className="font-display text-headline-md uppercase">No Announcements</h3>
            <p className="text-body-lg text-on-surface-variant font-body">Check back soon for updates from IronHide.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const cfg = typeConfig[item.type] ?? typeConfig.info;
              return (
                <div key={item.id} className={`border-l-4 bg-surface-container p-6 ${cfg.color.split(' ')[1] ? `border-l-4` : ''}`}
                  style={{ borderLeftColor: item.type === 'info' ? '#cc0000' : item.type === 'alert' ? '#facc15' : '#4ade80' }}>
                  <div className="flex items-start gap-4">
                    <span className={`material-symbols-outlined ${cfg.color.split(' ')[0]}`}>{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-display text-headline-md uppercase">{item.title}</h3>
                        <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="font-body text-body-md text-on-surface-variant mt-2">{item.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
