import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PageWrapper } from '../components/layout/PageWrapper';

interface OccupancyData {
  count: number;
  updatedAt: Date | null;
}

const CAPACITY = 50;

function getStatus(count: number): { label: string; color: string; bg: string } {
  const pct = count / CAPACITY;
  if (pct < 0.4) return { label: 'QUIET', color: 'text-green-400', bg: 'bg-green-400' };
  if (pct < 0.75) return { label: 'MODERATE', color: 'text-yellow-400', bg: 'bg-yellow-400' };
  return { label: 'BUSY', color: 'text-red-400', bg: 'bg-red-400' };
}

const PEAK_HOURS = [
  { hour: '5AM', pct: 45 }, { hour: '6AM', pct: 70 }, { hour: '7AM', pct: 85 },
  { hour: '8AM', pct: 60 }, { hour: '9AM', pct: 40 }, { hour: '10AM', pct: 30 },
  { hour: '11AM', pct: 25 }, { hour: '12PM', pct: 35 }, { hour: '1PM', pct: 30 },
  { hour: '2PM', pct: 20 }, { hour: '3PM', pct: 25 }, { hour: '4PM', pct: 45 },
  { hour: '5PM', pct: 80 }, { hour: '6PM', pct: 95 }, { hour: '7PM', pct: 90 },
  { hour: '8PM', pct: 70 }, { hour: '9PM', pct: 40 }, { hour: '10PM', pct: 20 },
];

export default function OccupancyPage() {
  const [occupancy, setOccupancy] = useState<OccupancyData>({ count: 0, updatedAt: null });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'gym_meta', 'occupancy'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setOccupancy({ count: d.count ?? 0, updatedAt: d.updatedAt?.toDate() ?? null });
      }
      setConnected(true);
    }, () => setConnected(false));
    return unsub;
  }, []);

  const status = getStatus(occupancy.count);
  const fillPct = Math.min(100, Math.round((occupancy.count / CAPACITY) * 100));

  return (
    <PageWrapper>
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg uppercase mb-4">LIVE OCCUPANCY</h1>
        <div className="w-24 h-1 bg-primary-container mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12">
          {/* Live Count */}
          <div className="bg-surface-container border-t-2 border-primary-container p-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${status.bg} ${connected ? 'animate-pulse' : ''}`} />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                {connected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <div className="font-display text-[96px] leading-none text-on-surface">{occupancy.count}</div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">people currently inside</p>
            <span className={`font-display text-headline-md uppercase ${status.color}`}>{status.label}</span>

            {/* Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-2">
                <span>0</span><span>Capacity: {CAPACITY}</span>
              </div>
              <div className="w-full bg-surface-container-highest h-4">
                <div
                  className={`h-full transition-all duration-1000 ${status.bg}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <p className="text-right font-label-sm text-label-sm text-on-surface-variant mt-1">{fillPct}% full</p>
            </div>

            {occupancy.updatedAt && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Updated: {occupancy.updatedAt.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Status info */}
          <div className="bg-surface-container border-t-2 border-primary-container p-8 space-y-6">
            <h3 className="font-display text-headline-md uppercase">STATUS GUIDE</h3>
            {[
              { label: 'QUIET', color: 'bg-green-400', desc: 'Under 40% — Great time to train. Equipment freely available.' },
              { label: 'MODERATE', color: 'bg-yellow-400', desc: '40–74% — Some wait times for popular equipment.' },
              { label: 'BUSY', color: 'bg-red-400', desc: '75%+ — Peak hours. Consider coming later.' },
            ].map(s => (
              <div key={s.label} className="flex items-start gap-4">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${s.color}`} />
                <div>
                  <p className="font-display text-headline-md">{s.label}</p>
                  <p className="font-body text-body-md text-on-surface-variant">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-surface-container border-t-2 border-primary-container p-8">
          <h3 className="font-display text-headline-md uppercase mb-2">TYPICAL PEAK HOURS</h3>
          <p className="font-body text-body-md text-on-surface-variant mb-8">Historical average occupancy by hour (weekdays)</p>
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
            {PEAK_HOURS.map(h => (
              <div key={h.hour} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className={`w-full transition-all ${h.pct >= 75 ? 'bg-red-400' : h.pct >= 40 ? 'bg-yellow-400' : 'bg-green-400'}`}
                    style={{ height: `${h.pct}%` }}
                  />
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
