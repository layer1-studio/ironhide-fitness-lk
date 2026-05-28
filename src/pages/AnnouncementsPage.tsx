import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Spinner } from '../components/ui/Spinner';
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
        {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
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
