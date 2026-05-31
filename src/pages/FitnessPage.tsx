import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
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
interface BodyMetric {
  id: string; date: Date; weight: number; bodyFat: number;
  chest: number; waist: number; hips: number; arms: number; thighs: number;
}
interface Goal {
  id: string;
  type: 'weight' | 'body_fat' | 'exercise';
  targetValue: number;
  targetUnit: string;
  exerciseName: string;
  deadline: Date | null;
  createdAt: Date;
  achieved: boolean;
}

function TrendChart({ label, data, unit }: { label: string; data: { date: Date; value: number }[]; unit: string }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 300; const H = 80;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.value - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="space-y-1">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 bg-surface-container-high">
        <polyline points={points} fill="none" stroke="#cc0000" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
        <span>{data[0].value}{unit}</span>
        <span>{data[data.length - 1].value}{unit}</span>
      </div>
    </div>
  );
}

function FitnessContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'log' | 'metrics' | 'history' | 'goals'>('log');
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Workout form
  const [exercises, setExercises] = useState<WorkoutSet[]>([{ exercise: '', sets: 3, reps: 10, weight: 0 }]);
  const [notes, setNotes] = useState('');

  // Metrics form
  const [metricForm, setMetricForm] = useState({
    weight: '', bodyFat: '',
    chest: '', waist: '', hips: '', arms: '', thighs: '',
  });

  // Goal form
  const [goalType, setGoalType] = useState<'weight' | 'body_fat' | 'exercise'>('weight');
  const [goalExerciseName, setGoalExerciseName] = useState('');
  const [goalTargetValue, setGoalTargetValue] = useState('');
  const [goalTargetUnit, setGoalTargetUnit] = useState('kg');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'members', user.uid, 'workouts'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'members', user.uid, 'body_metrics'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'members', user.uid, 'goals'), orderBy('createdAt', 'desc'))),
    ]).then(([wSnap, mSnap, gSnap]) => {
      setLogs(wSnap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }) as WorkoutLog));
      setMetrics(mSnap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }) as BodyMetric));
      setGoals(gSnap.docs.map(d => ({
        id: d.id, ...d.data(),
        deadline: d.data().deadline?.toDate?.() ?? null,
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Goal[]);
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
      const chest = Number(metricForm.chest);
      const waist = Number(metricForm.waist);
      const hips = Number(metricForm.hips);
      const arms = Number(metricForm.arms);
      const thighs = Number(metricForm.thighs);

      // Range validation (skip silently if 0)
      if (chest && (chest < 50 || chest > 200)) { setSaving(false); return; }
      if (waist && (waist < 40 || waist > 200)) { setSaving(false); return; }
      if (hips && (hips < 50 || hips > 200)) { setSaving(false); return; }
      if (arms && (arms < 15 || arms > 60)) { setSaving(false); return; }
      if (thighs && (thighs < 20 || thighs > 100)) { setSaving(false); return; }

      const ref = await addDoc(collection(db, 'members', user.uid, 'body_metrics'), {
        weight: Number(metricForm.weight),
        bodyFat: Number(metricForm.bodyFat),
        chest, waist, hips, arms, thighs,
        date: serverTimestamp(),
      });
      setMetrics(m => [{
        id: ref.id, date: new Date(),
        weight: Number(metricForm.weight),
        bodyFat: Number(metricForm.bodyFat),
        chest, waist, hips, arms, thighs,
      }, ...m]);
      setMetricForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', thighs: '' });
    } finally { setSaving(false); }
  };

  const saveGoal = async () => {
    if (!user || !goalTargetValue) return;
    setGoalSaving(true);
    try {
      const ref = await addDoc(collection(db, 'members', user.uid, 'goals'), {
        type: goalType,
        targetValue: Number(goalTargetValue),
        targetUnit: goalTargetUnit,
        exerciseName: goalExerciseName,
        deadline: goalDeadline ? Timestamp.fromDate(new Date(goalDeadline)) : null,
        createdAt: serverTimestamp(),
        achieved: false,
      });
      const newGoal: Goal = {
        id: ref.id,
        type: goalType,
        targetValue: Number(goalTargetValue),
        targetUnit: goalTargetUnit,
        exerciseName: goalExerciseName,
        deadline: goalDeadline ? new Date(goalDeadline) : null,
        createdAt: new Date(),
        achieved: false,
      };
      setGoals(g => [newGoal, ...g]);
      // Reset form
      setGoalType('weight');
      setGoalExerciseName('');
      setGoalTargetValue('');
      setGoalTargetUnit('kg');
      setGoalDeadline('');
      setShowGoalModal(false);
    } finally { setGoalSaving(false); }
  };

  const markGoalAchieved = async (goalId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'members', user.uid, 'goals', goalId), { achieved: true });
    setGoals(g => g.map(goal => goal.id === goalId ? { ...goal, achieved: true } : goal));
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'members', user.uid, 'goals', goalId));
    setGoals(g => g.filter(goal => goal.id !== goalId));
  };

  const tabs = [
    { key: 'log' as const, label: 'Log Workout' },
    { key: 'metrics' as const, label: 'Body Metrics' },
    { key: 'history' as const, label: 'History' },
    { key: 'goals' as const, label: 'Goals' },
  ];

  // Measurement trend data helpers
  const trendData = (field: keyof BodyMetric) =>
    metrics
      .map(m => ({ date: m.date, value: m[field] as number }))
      .filter(d => d.value && d.value > 0)
      .reverse();

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">FITNESS TRACKER</h1>
      <div className="w-24 h-1 bg-primary-container mb-8" />

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-border-default mb-8">
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
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Chest (cm)" type="number" value={metricForm.chest} onChange={e => setMetricForm(p => ({ ...p, chest: e.target.value }))} placeholder="0" />
                  <Input label="Waist (cm)" type="number" value={metricForm.waist} onChange={e => setMetricForm(p => ({ ...p, waist: e.target.value }))} placeholder="0" />
                  <Input label="Hips (cm)" type="number" value={metricForm.hips} onChange={e => setMetricForm(p => ({ ...p, hips: e.target.value }))} placeholder="0" />
                  <Input label="Arms (cm)" type="number" value={metricForm.arms} onChange={e => setMetricForm(p => ({ ...p, arms: e.target.value }))} placeholder="0" />
                  <Input label="Thighs (cm)" type="number" value={metricForm.thighs} onChange={e => setMetricForm(p => ({ ...p, thighs: e.target.value }))} placeholder="0" />
                </div>
                <Button variant="primary" loading={saving} onClick={saveMetric}>SAVE METRICS</Button>
              </div>

              {metrics.length > 0 && (
                <div className="space-y-8">
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

                  {/* Measurement Trend Charts */}
                  <div>
                    <h3 className="font-display text-headline-md uppercase mb-4">Measurement Trends</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TrendChart label="Body Fat" data={trendData('bodyFat')} unit="%" />
                      <TrendChart label="Chest" data={trendData('chest')} unit="cm" />
                      <TrendChart label="Waist" data={trendData('waist')} unit="cm" />
                      <TrendChart label="Hips" data={trendData('hips')} unit="cm" />
                      <TrendChart label="Arms" data={trendData('arms')} unit="cm" />
                      <TrendChart label="Thighs" data={trendData('thighs')} unit="cm" />
                    </div>
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

          {/* Goals */}
          {tab === 'goals' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-headline-md uppercase">Your Goals</h2>
                <button onClick={() => setShowGoalModal(true)} className="bg-primary-container text-on-primary-container px-4 py-2 font-display text-body-md uppercase hover:scale-105 transition-all">
                  ADD GOAL
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant opacity-40">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                  <h3 className="font-display text-headline-md uppercase">No goals set yet</h3>
                  <p className="text-body-lg text-on-surface-variant font-body max-w-sm">Set your first goal to start tracking progress.</p>
                  <button onClick={() => setShowGoalModal(true)} className="bg-primary-container text-on-primary-container px-6 py-2 font-display text-body-md uppercase hover:scale-105 transition-all">ADD FIRST GOAL</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map(g => {
                    const current =
                      g.type === 'weight' ? (metrics[0]?.weight ?? null) :
                      g.type === 'body_fat' ? (metrics[0]?.bodyFat ?? null) :
                      null;
                    const progressPct = current !== null
                      ? Math.min(100, Math.round((current / g.targetValue) * 100))
                      : null;
                    const title =
                      g.type === 'weight' ? `Target Weight: ${g.targetValue}${g.targetUnit}` :
                      g.type === 'body_fat' ? `Target Body Fat: ${g.targetValue}${g.targetUnit}` :
                      `${g.exerciseName}: ${g.targetValue} ${g.targetUnit}`;

                    return (
                      <div key={g.id} className={`bg-surface-container border-l-4 p-4 space-y-3 ${g.achieved ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-display text-headline-md">{title}</p>
                            {g.achieved && <span className="font-label-sm text-label-sm text-green-500 uppercase">Achieved</span>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {!g.achieved && (
                              <button onClick={() => markGoalAchieved(g.id)} className="font-label-sm text-label-sm bg-green-500 text-white px-3 py-1 uppercase hover:opacity-80 transition-all">
                                Mark Achieved
                              </button>
                            )}
                            <button onClick={() => deleteGoal(g.id)} className="font-label-sm text-label-sm text-on-surface-variant hover:text-error px-2 py-1 uppercase transition-all">
                              Delete
                            </button>
                          </div>
                        </div>

                        {g.type !== 'exercise' && current !== null ? (
                          <div className="space-y-1">
                            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                              <span>Current: {current}{g.targetUnit}</span>
                              <span>{progressPct}%</span>
                            </div>
                            <div className="bg-surface-container-high h-2 rounded-full">
                              <div className="bg-primary-container h-2 rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        ) : g.type === 'exercise' ? (
                          <p className="font-body text-body-md text-on-surface-variant">Log a workout to track progress</p>
                        ) : null}

                        {g.deadline && (
                          <p className="font-label-sm text-label-sm text-on-surface-variant">Deadline: {formatDate(g.deadline)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-surface-container border-t-2 border-primary-container p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-headline-md uppercase">Set a Goal</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Goal type selector */}
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">Goal Type</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'weight' as const, label: 'Target Weight' },
                  { key: 'body_fat' as const, label: 'Target Body Fat' },
                  { key: 'exercise' as const, label: 'Exercise Goal' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setGoalType(opt.key);
                      setGoalTargetUnit(opt.key === 'weight' ? 'kg' : opt.key === 'body_fat' ? '%' : '');
                    }}
                    className={`px-3 py-2 font-label-sm text-label-sm uppercase transition-all ${goalType === opt.key ? 'bg-primary-container text-on-primary-container' : 'border border-border-default text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {goalType === 'exercise' && (
              <Input
                label="Exercise Name"
                value={goalExerciseName}
                onChange={e => setGoalExerciseName(e.target.value)}
                placeholder="e.g. Bench Press"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Target Value (${goalType === 'weight' ? 'kg' : goalType === 'body_fat' ? '%' : goalTargetUnit || 'unit'})`}
                type="number"
                value={goalTargetValue}
                onChange={e => setGoalTargetValue(e.target.value)}
                placeholder="0"
              />
              {goalType === 'exercise' && (
                <Input
                  label="Unit (e.g. reps, kg)"
                  value={goalTargetUnit}
                  onChange={e => setGoalTargetUnit(e.target.value)}
                  placeholder="reps"
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Deadline (optional)</label>
              <input
                type="date"
                value={goalDeadline}
                onChange={e => setGoalDeadline(e.target.value)}
                className="bg-surface-container border border-border-default text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container font-body text-body-md"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" loading={goalSaving} onClick={saveGoal}>SAVE GOAL</Button>
              <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant uppercase hover:text-on-surface transition-all">
                CANCEL
              </button>
            </div>
          </div>
        </div>
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
