import { useEffect, useState } from 'react';
import {
  collection, getDocs, orderBy, query,
  addDoc, updateDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { storage } from '../../lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getMember, updateMember, generateMembershipId } from '../../lib/memberService';
import { calculateBMI } from '../../lib/utils';
import type { Member } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANS = [
  { name: 'Daily',         price: 2500,   duration: '1 day' },
  { name: 'Monthly',       price: 15000,  duration: '1 month' },
  { name: 'Annual',        price: 165000, duration: '12 months' },
  { name: 'Annual Couple', price: 310000, duration: '12 months' },
];

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash at Gym' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

function calcExpiry(planName: string): Date {
  const d = new Date();
  const lower = planName.toLowerCase();
  if (lower === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (lower.startsWith('annual')) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminMemberRow = {
  uid: string;
  membershipId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  membershipTier: string;
  membershipStatus: Member['membershipStatus'];
  membershipExpiry: Date | null;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return new Date(value as string | number);
}

function toISODateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Shared modal wrapper ───────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4">
      <div className="bg-surface-container w-full max-w-2xl border border-surface-container-highest shadow-2xl">
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-container-highest">
          <h2 className="font-display text-headline-md uppercase">{title}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-surface-container-high border border-surface-container-highest text-on-surface px-4 py-2 text-body-md w-full focus:border-primary-container focus:outline-none rounded';
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = `${inputCls} min-h-24 resize-y`;

// ── Add Member Modal (Item 5) ──────────────────────────────────────────────────

interface AddMemberModalProps {
  onClose: () => void;
  onAdded: (row: AdminMemberRow) => void;
}

function AddMemberModal({ onClose, onAdded }: AddMemberModalProps) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    ecName: '',
    ecPhone: '',
    transportMode: '',
    height: '',
    weight: '',
    medicalConditions: '',
    medications: '',
    injuries: '',
    secondaryMemberEmail: '',
    plan: 'Monthly',
    method: 'cash' as PaymentMethod,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLANS.find(p => p.name === form.plan) ?? PLANS[1];

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    if (!form.phone.trim()) { setError('Phone is required.'); return; }
    if (!form.dob) { setError('Date of birth is required.'); return; }
    if (!form.gender) { setError('Gender is required.'); return; }
    if (!form.address.trim()) { setError('Address is required.'); return; }
    if (!form.transportMode) { setError('Usual transport is required.'); return; }
    if (!form.height || Number(form.height) <= 0) { setError('Height is required.'); return; }
    if (!form.weight || Number(form.weight) <= 0) { setError('Weight is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const membershipId = await generateMembershipId();
      const expiry = calcExpiry(selectedPlan.name);

      const memberRef = await addDoc(collection(db, 'members'), {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dob: Timestamp.fromDate(new Date(`${form.dob}T00:00:00`)),
        gender: form.gender,
        address: form.address.trim(),
        emergencyContact: { name: form.ecName.trim(), phone: form.ecPhone.trim() },
        height: Number(form.height),
        weight: Number(form.weight),
        bmi: calculateBMI(Number(form.height), Number(form.weight)),
        medicalConditions: form.medicalConditions.trim(),
        medications: form.medications.trim(),
        injuries: form.injuries.trim(),
        photoUrl: '',
        transportMode: form.transportMode,
        ...(form.secondaryMemberEmail.trim() ? { secondaryMemberEmail: form.secondaryMemberEmail.trim() } : {}),
        membershipId,
        membershipTier: selectedPlan.name,
        membershipStatus: 'active',
        membershipStatusSource: 'admin',
        membershipExpiry: Timestamp.fromDate(expiry),
        role: 'customer',
        adminCreated: true,
        createdAt: serverTimestamp(),
      });

      if (photoFile) {
        try {
          const photoRef = ref(storage, `members/${memberRef.id}/profile.jpg`);
          await uploadBytes(photoRef, photoFile);
          await updateDoc(memberRef, { photoUrl: await getDownloadURL(photoRef) });
        } catch (photoErr) {
          console.warn('[AdminMemberships] member created but profile photo upload failed:', photoErr);
        }
      }

      await addDoc(collection(db, 'members', memberRef.id, 'payments'), {
        amount: selectedPlan.price,
        plan: selectedPlan.name,
        method: form.method,
        status: 'confirmed',
        memberName: form.fullName.trim(),
        createdAt: serverTimestamp(),
      });

      onAdded({
        uid: memberRef.id,
        membershipId,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        membershipTier: selectedPlan.name,
        membershipStatus: 'active',
        membershipExpiry: expiry,
        createdAt: new Date(),
      });
      onClose();
    } catch (err) {
      console.error('[AdminMemberships] addMember failed:', err);
      setError('Failed to create member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add New Member" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow label="Full Name *">
            <input className={inputCls} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Kasun Perera" />
          </FieldRow>
          <FieldRow label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </FieldRow>
          <FieldRow label="Phone *">
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07X XXX XXXX" />
          </FieldRow>
          <FieldRow label="Date of Birth">
            <input className={inputCls} type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
          </FieldRow>
          <FieldRow label="Gender">
            <select className={selectCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </FieldRow>
          <FieldRow label="Address">
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City" />
          </FieldRow>
          <FieldRow label="Emergency Contact Name">
            <input className={inputCls} value={form.ecName} onChange={e => set('ecName', e.target.value)} placeholder="Name" />
          </FieldRow>
          <FieldRow label="Emergency Contact Phone">
            <input className={inputCls} value={form.ecPhone} onChange={e => set('ecPhone', e.target.value)} placeholder="07X XXX XXXX" />
          </FieldRow>
          <FieldRow label="Usual Transport *">
            <select className={selectCls} value={form.transportMode} onChange={e => set('transportMode', e.target.value)}>
              <option value="">Select…</option>
              <option value="Car">Car</option>
              <option value="Motorbike">Motorbike</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Walk">Walk</option>
              <option value="Public Transport">Public Transport</option>
            </select>
          </FieldRow>
          <FieldRow label="Secondary Member Email">
            <input className={inputCls} type="email" value={form.secondaryMemberEmail} onChange={e => set('secondaryMemberEmail', e.target.value)} placeholder="For couple plans (optional)" />
          </FieldRow>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-title-md uppercase">Health Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FieldRow label="Height (cm) *">
              <input className={inputCls} type="number" min="1" value={form.height} onChange={e => set('height', e.target.value)} placeholder="e.g. 175" />
            </FieldRow>
            <FieldRow label="Weight (kg) *">
              <input className={inputCls} type="number" min="1" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 75" />
            </FieldRow>
          </div>
          <FieldRow label="BMI (Auto)">
            <div className={`${inputCls} text-on-surface-variant`}>
              {form.height && form.weight && Number(form.height) > 0 && Number(form.weight) > 0
                ? calculateBMI(Number(form.height), Number(form.weight))
                : 'Enter height and weight'}
            </div>
          </FieldRow>
          <FieldRow label="Pre-existing Medical Conditions">
            <textarea className={textareaCls} value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} placeholder="List any conditions, or write 'None'" />
          </FieldRow>
          <FieldRow label="Current Medications">
            <textarea className={textareaCls} value={form.medications} onChange={e => set('medications', e.target.value)} placeholder="List any medications, or write 'None'" />
          </FieldRow>
          <FieldRow label="Previous Injuries">
            <textarea className={textareaCls} value={form.injuries} onChange={e => set('injuries', e.target.value)} placeholder="List any injuries, or write 'None'" />
          </FieldRow>
        </div>

        <FieldRow label="Profile Photo">
          <input className={inputCls} type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
          <span className="text-label-sm text-on-surface-variant">Used for the member profile and face recognition entry.</span>
        </FieldRow>

        <hr className="border-surface-container-highest" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow label="Membership Plan *">
            <select className={selectCls} value={form.plan} onChange={e => set('plan', e.target.value)}>
              {PLANS.map(p => (
                <option key={p.name} value={p.name}>{p.name} — LKR {p.price.toLocaleString()} / {p.duration}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Payment Method *">
            <select className={selectCls} value={form.method} onChange={e => set('method', e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FieldRow>
        </div>

        <div className="bg-surface-container-high border border-surface-container-highest rounded p-4 text-body-sm text-on-surface-variant space-y-1">
          <div>Amount: <span className="text-on-surface font-display">LKR {selectedPlan.price.toLocaleString()}</span></div>
          <div>Membership valid until: <span className="text-on-surface font-display">{calcExpiry(selectedPlan.name).toLocaleDateString()}</span></div>
        </div>

        {error && <p className="text-error text-body-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>CREATE MEMBER</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Activate Membership Modal (Item 6) ─────────────────────────────────────────

interface ActivateModalProps {
  member: AdminMemberRow;
  onClose: () => void;
  onActivated: (uid: string, tier: string, expiry: Date) => void;
}

function ActivateModal({ member, onClose, onActivated }: ActivateModalProps) {
  const [plan, setPlan] = useState('Monthly');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLANS.find(p => p.name === plan) ?? PLANS[1];
  const expiry = calcExpiry(selectedPlan.name);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'members', member.uid), {
        membershipStatus: 'active',
        membershipStatusSource: 'admin',
        membershipTier: selectedPlan.name,
        membershipExpiry: Timestamp.fromDate(expiry),
      });
      await addDoc(collection(db, 'members', member.uid, 'payments'), {
        amount: selectedPlan.price,
        plan: selectedPlan.name,
        method,
        status: 'confirmed',
        memberName: member.fullName,
        createdAt: serverTimestamp(),
      });
      onActivated(member.uid, selectedPlan.name, expiry);
      onClose();
    } catch (err) {
      console.error('[AdminMemberships] activate failed:', err);
      setError('Activation failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Activate — ${member.fullName}`} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-md text-on-surface-variant">
          Record an in-person payment and activate membership immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow label="Plan *">
            <select className={selectCls} value={plan} onChange={e => setPlan(e.target.value)}>
              {PLANS.map(p => (
                <option key={p.name} value={p.name}>{p.name} — LKR {p.price.toLocaleString()}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Payment Method *">
            <select className={selectCls} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FieldRow>
        </div>

        <div className="bg-surface-container-high border border-surface-container-highest rounded p-4 text-body-sm text-on-surface-variant space-y-1">
          <div>Amount: <span className="text-on-surface font-display">LKR {selectedPlan.price.toLocaleString()}</span></div>
          <div>Expires: <span className="text-on-surface font-display">{expiry.toLocaleDateString()}</span></div>
          <div>Start date: <span className="text-on-surface font-display">Today ({new Date().toLocaleDateString()})</span></div>
        </div>

        {error && <p className="text-error text-body-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>ACTIVATE</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Member Modal (Item 7) ─────────────────────────────────────────────────

interface EditModalProps {
  member: AdminMemberRow;
  onClose: () => void;
  onSaved: (updated: Partial<AdminMemberRow>) => void;
}

function EditModal({ member, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    address: member.address,
    membershipTier: member.membershipTier,
    membershipStatus: member.membershipStatus,
    membershipExpiry: member.membershipExpiry ? toISODateInput(member.membershipExpiry) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const updates: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        membershipTier: form.membershipTier,
        membershipStatus: form.membershipStatus,
        membershipStatusSource: 'admin',
      };
      if (form.membershipExpiry) {
        updates.membershipExpiry = Timestamp.fromDate(new Date(form.membershipExpiry));
      }
      await updateDoc(doc(db, 'members', member.uid), updates);
      onSaved({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        membershipTier: form.membershipTier,
        membershipStatus: form.membershipStatus as Member['membershipStatus'],
        membershipExpiry: form.membershipExpiry ? new Date(form.membershipExpiry) : null,
      });
      onClose();
    } catch (err) {
      console.error('[AdminMemberships] edit failed:', err);
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit — ${member.fullName}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow label="Full Name *">
            <input className={inputCls} value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          </FieldRow>
          <FieldRow label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </FieldRow>
          <FieldRow label="Phone">
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </FieldRow>
          <FieldRow label="Address">
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} />
          </FieldRow>
          <FieldRow label="Plan">
            <select className={selectCls} value={form.membershipTier} onChange={e => set('membershipTier', e.target.value)}>
              <option value="">—</option>
              {PLANS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Status">
            <select className={selectCls} value={form.membershipStatus} onChange={e => set('membershipStatus', e.target.value)}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="pending_cash">Pending Cash</option>
              <option value="rejected">Rejected</option>
            </select>
          </FieldRow>
          <FieldRow label="Expiry Date">
            <input className={inputCls} type="date" value={form.membershipExpiry} onChange={e => set('membershipExpiry', e.target.value)} />
          </FieldRow>
        </div>

        {error && <p className="text-error text-body-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>SAVE CHANGES</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AdminMembershipsContent() {
  const [members, setMembers] = useState<AdminMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activateMember, setActivateMember] = useState<AdminMemberRow | null>(null);
  const [editMember, setEditMember] = useState<AdminMemberRow | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'members'), orderBy('createdAt', 'desc')));
      const rows = await Promise.all(snap.docs.map(async (docSnap) => {
        const member = await getMember(docSnap.id);
        const data = (member
          ? { ...member, ...docSnap.data() }
          : docSnap.data()
        ) as Partial<Member> & Record<string, unknown>;
        const expiryValue = data.membershipExpiry ?? data.expireAt ?? data.expiryAt;
        return {
          uid: docSnap.id,
          membershipId: String(data.membershipId || docSnap.id.slice(0, 10).toUpperCase()),
          fullName: String(data.fullName || ''),
          email: String(data.email || ''),
          phone: String(data.phone || ''),
          address: String(data.address || ''),
          membershipTier: String(data.membershipTier || ''),
          membershipStatus: (data.membershipStatus as Member['membershipStatus']) || 'active',
          membershipExpiry: expiryValue ? toDate(expiryValue) : null,
          createdAt: toDate(data.createdAt),
        } as AdminMemberRow;
      }));
      setMembers(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadMembers(); }, []);

  const deactivateMember = async (uid: string) => {
    if (!window.confirm('Deactivate this membership?')) return;
    await updateMember(uid, { membershipStatus: 'expired', membershipStatusSource: 'admin' });
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, membershipStatus: 'expired' } : m));
  };

  const filtered = members.filter(m => {
    const matchesSearch = !search.trim() ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.membershipId.toLowerCase().includes(search.toLowerCase());
    if (!expiryFilter || !m.membershipExpiry) return matchesSearch;
    const [y, mo, d] = expiryFilter.split('-').map(Number);
    return matchesSearch &&
      m.membershipExpiry.getFullYear() === y &&
      m.membershipExpiry.getMonth() === mo - 1 &&
      m.membershipExpiry.getDate() === d;
  });

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-headline-lg uppercase">MEMBERSHIP MANAGEMENT</h1>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <span className="material-symbols-outlined text-base">person_add</span>
          ADD MEMBER
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <Input placeholder="Search by name, email or ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full md:w-64">
          <Input label="Filter by expiry date" type="date" value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} />
        </div>
        {expiryFilter && (
          <Button variant="ghost" size="sm" onClick={() => setExpiryFilter('')}>Clear</Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary-container text-5xl animate-spin">progress_activity</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest border-b border-surface-container-highest">
                {['ID', 'Member', 'Plan', 'Email', 'Status', 'Expiry', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="py-3 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant text-body-md">
                    No members found.
                  </td>
                </tr>
              )}
              {filtered.map(m => (
                <tr key={m.uid} className="border-b border-surface-container-highest/50 hover:bg-surface-container transition">
                  <td className="py-4 pr-4 font-display text-sm text-primary-container">{m.membershipId}</td>
                  <td className="py-4 pr-4 font-display">{m.fullName}</td>
                  <td className="py-4 pr-4 text-on-surface-variant">{m.membershipTier || '—'}</td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm">{m.email}</td>
                  <td className="py-4 pr-4"><Badge status={m.membershipStatus} /></td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm">
                    {m.membershipExpiry ? m.membershipExpiry.toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm">{m.createdAt.toLocaleDateString()}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      {/* Activate / Renew */}
                      <button
                        title="Activate / Renew membership"
                        onClick={() => setActivateMember(m)}
                        className="flex items-center gap-1 px-3 py-1.5 text-label-sm border border-surface-container-highest text-on-surface-variant hover:border-primary-container hover:text-primary-container transition rounded"
                      >
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Activate
                      </button>
                      {/* Edit */}
                      <button
                        title="Edit member"
                        onClick={() => setEditMember(m)}
                        className="flex items-center gap-1 px-3 py-1.5 text-label-sm border border-surface-container-highest text-on-surface-variant hover:border-primary-container hover:text-primary-container transition rounded"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Edit
                      </button>
                      {/* Deactivate */}
                      {m.membershipStatus !== 'expired' && (
                        <button
                          title="Deactivate"
                          onClick={() => void deactivateMember(m.uid)}
                          className="flex items-center gap-1 px-3 py-1.5 text-label-sm border border-surface-container-highest text-on-surface-variant hover:border-error hover:text-error transition rounded"
                        >
                          <span className="material-symbols-outlined text-sm">block</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdded={row => setMembers(prev => [row, ...prev])}
        />
      )}
      {activateMember && (
        <ActivateModal
          member={activateMember}
          onClose={() => setActivateMember(null)}
          onActivated={(uid, tier, expiry) =>
            setMembers(prev => prev.map(m =>
              m.uid === uid ? { ...m, membershipTier: tier, membershipStatus: 'active', membershipExpiry: expiry } : m
            ))
          }
        />
      )}
      {editMember && (
        <EditModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={updates =>
            setMembers(prev => prev.map(m =>
              m.uid === editMember.uid ? { ...m, ...updates } : m
            ))
          }
        />
      )}
    </div>
  );
}

export default function AdminMembershipsPage() {
  return <AdminMembershipsContent />;
}
