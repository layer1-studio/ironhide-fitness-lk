import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { formatDate } from '../lib/utils';

interface WorkoutSet { exercise: string; sets: number; reps: number; weight: number; }
interface WorkoutLog { id: string; date: Date; exercises: WorkoutSet[]; notes: string; }
interface BodyMetric { id: string; date: Date; weight: number; bodyFat: number; }

function FitnessContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'log' | 'metrics' | 'history'>('log');
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Workout form
  const [exercises, setExercises] = useState<WorkoutSet[]>([{ exercise: '', sets: 3, reps: 10, weight: 0 }]);
  const [notes, setNotes] = useState('');

  // Metrics form
  const [metricForm, setMetricForm] = useState({ weight: '', bodyFat: '' });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'members', user.uid, 'workouts'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'members', user.uid, 'body_metrics'), orderBy('date', 'desc'))),
    ]).then(([wSnap, mSnap]) => {
      setLogs(wSnap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }) as WorkoutLog));
      setMetrics(mSnap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }) as BodyMetric));
    }).finally(() => setLoading(false));
  }, [user]);

  const addExercise = () => setExercises(e => [...e, { exercise: '', sets: 3, reps: 10, weight: 0 }]);
  const removeExercise = (i: number) => setExercises(e => e.filter((_, idx) => idx !== i));
  const updateExercise = (i: number, field: keyof WorkoutSet, value: string | number) =>
    setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));

  const saveWorkout = async () => {
    if (!user || !exercises[0].exercise) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'members', user.uid, 'workouts'), {
        exercises, notes, date: serverTimestamp(),
      });
      setLogs(l => [{ id: ref.id, date: new Date(), exercises, notes }, ...l]);
      setExercises([{ exercise: '', sets: 3, reps: 10, weight: 0 }]);
      setNotes('');
      setTab('history');
    } finally { setSaving(false); }
  };

  const saveMetric = async () => {
    if (!user || !metricForm.weight) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'members', user.uid, 'body_metrics'), {
        weight: Number(metricForm.weight),
        bodyFat: Number(metricForm.bodyFat),
        date: serverTimestamp(),
      });
      setMetrics(m => [{ id: ref.id, date: new Date(), weight: Number(metricForm.weight), bodyFat: Number(metricForm.bodyFat) }, ...m]);
      setMetricForm({ weight: '', bodyFat: '' });
    } finally { setSaving(false); }
  };

  const tabs = [
    { key: 'log' as const, label: 'Log Workout' },
    { key: 'metrics' as const, label: 'Body Metrics' },
    { key: 'history' as const, label: 'History' },
  ];

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">FITNESS TRACKER</h1>
      <div className="w-24 h-1 bg-primary-container mb-8" />

      {/* Tabs */}
      <div className="flex border-b border-border-default mb-8">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`font-display text-headline-md px-6 py-3 uppercase transition-all ${tab === t.key ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <>
          {/* Log Workout */}
          {tab === 'log' && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="font-display text-headline-md uppercase">Log Today's Workout</h2>
              {exercises.map((ex, i) => (
                <div key={i} className="bg-surface-container border-l-4 border-primary-container p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-primary-container uppercase">Exercise {i + 1}</span>
                    {i > 0 && <button onClick={() => removeExercise(i)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-sm">close</span></button>}
                  </div>
                  <Input placeholder="Exercise name (e.g. Bench Press)" value={ex.exercise} onChange={e => updateExercise(i, 'exercise', e.target.value)} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="Sets" type="number" value={String(ex.sets)} onChange={e => updateExercise(i, 'sets', Number(e.target.value))} />
                    <Input label="Reps" type="number" value={String(ex.reps)} onChange={e => updateExercise(i, 'reps', Number(e.target.value))} />
                    <Input label="Weight (kg)" type="number" value={String(ex.weight)} onChange={e => updateExercise(i, 'weight', Number(e.target.value))} />
                  </div>
                </div>
              ))}
              <button onClick={addExercise} className="flex items-center gap-2 text-primary-container font-body text-body-md hover:underline">
                <span className="material-symbols-outlined">add</span> Add Exercise
              </button>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it go?" rows={3}
                  className="bg-surface-container border border-border-default text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container resize-none font-body text-body-md" />
              </div>
              <Button variant="primary" size="lg" loading={saving} onClick={saveWorkout}>SAVE WORKOUT</Button>
            </div>
          )}

          {/* Body Metrics */}
          {tab === 'metrics' && (
            <div className="space-y-8 max-w-2xl">
              <div className="space-y-4">
                <h2 className="font-display text-headline-md uppercase">Record Measurements</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Body Weight (kg)" type="number" value={metricForm.weight} onChange={e => setMetricForm(p => ({ ...p, weight: e.target.value }))} placeholder="75.5" />
                  <Input label="Body Fat %" type="number" value={metricForm.bodyFat} onChange={e => setMetricForm(p => ({ ...p, bodyFat: e.target.value }))} placeholder="15.0" />
                </div>
                <Button variant="primary" loading={saving} onClick={saveMetric}>SAVE METRICS</Button>
              </div>

              {metrics.length > 0 && (
                <div>
                  <h3 className="font-display text-headline-md uppercase mb-4">Weight History</h3>
                  <div className="space-y-2">
                    {metrics.slice(0, 10).map(m => (
                      <div key={m.id} className="flex items-center gap-4">
                        <span className="font-label-sm text-label-sm text-on-surface-variant w-24">{formatDate(m.date)}</span>
                        <div className="flex-1 bg-surface-container-high h-6 relative">
                          <div className="bg-primary-container h-full" style={{ width: `${Math.min(100, (m.weight / 150) * 100)}%` }} />
                        </div>
                        <span className="font-display text-headline-md w-16 text-right">{m.weight}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {tab === 'history' && (
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant opacity-40"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                  <h3 className="font-display text-headline-md uppercase">No Workouts Logged</h3>
                  <p className="text-body-lg text-on-surface-variant font-body max-w-sm">Start logging your workouts and they'll appear here.</p>
                  <button onClick={() => setTab('log')} className="bg-primary-container text-on-primary-container px-6 py-2 font-display text-body-md uppercase hover:scale-105 transition-all">LOG FIRST WORKOUT</button>
                </div>
              ) : logs.map(log => (
                <div key={log.id} className="bg-surface-container border-l-4 border-primary-container p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-display text-headline-md uppercase">{formatDate(log.date)}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{log.exercises.length} exercises</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {log.exercises.map((ex, i) => (
                      <div key={i} className="bg-surface-container-high p-3">
                        <p className="font-label-sm text-label-sm text-primary-container uppercase truncate">{ex.exercise}</p>
                        <p className="font-body text-body-md">{ex.sets}×{ex.reps} @ {ex.weight}kg</p>
                      </div>
                    ))}
                  </div>
                  {log.notes && <p className="mt-3 font-body text-body-md text-on-surface-variant italic">"{log.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FitnessPage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <FitnessContent />
      </PageWrapper>
    </AuthGuard>
  );
}
