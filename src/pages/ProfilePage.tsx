import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { getMember, updateMember } from '../lib/memberService';
import { calculateBMI } from '../lib/utils';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import type { Member } from '../types';

function ProfileContent() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '',
    emergencyName: '', emergencyPhone: '',
    height: '', weight: '',
    medicalConditions: '', medications: '', injuries: '',
  });

  useEffect(() => {
    if (!user) return;
    getMember(user.uid).then(m => {
      if (!m) return;
      setMember(m);
      setForm({
        fullName: m.fullName,
        phone: m.phone,
        address: m.address,
        emergencyName: m.emergencyContact.name,
        emergencyPhone: m.emergencyContact.phone,
        height: String(m.height),
        weight: String(m.weight),
        medicalConditions: m.medicalConditions,
        medications: m.medications,
        injuries: m.injuries,
      });
    }).finally(() => setLoading(false));
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      let photoUrl = member?.photoUrl ?? '';
      if (photoFile) {
        const photoRef = ref(storage, `members/${user.uid}/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        photoUrl = await getDownloadURL(photoRef);
      }
      const bmi = calculateBMI(Number(form.height), Number(form.weight));
      await updateMember(user.uid, {
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone },
        height: Number(form.height),
        weight: Number(form.weight),
        bmi,
        medicalConditions: form.medicalConditions,
        medications: form.medications,
        injuries: form.injuries,
        photoUrl,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <h1 className="font-display text-headline-lg uppercase mb-4">EDIT PROFILE</h1>
      <div className="w-24 h-1 bg-primary-container mb-12" />

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center gap-6">
          <div className="w-48 h-48 border-4 border-primary-container overflow-hidden">
            {(photoPreview || member?.photoUrl) ? (
              <img src={photoPreview || member?.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-6xl">person</span>
              </div>
            )}
          </div>
          <label className="cursor-pointer bg-surface-container text-on-surface px-4 py-2 border border-border-default hover:border-primary-container transition-all font-body text-body-md">
            Change Photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          {member && (
            <div className="text-center space-y-1">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Email</p>
              <p className="font-body text-body-md">{member.email}</p>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Full Name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
            <Input label="Phone Number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <Input label="Home Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Emergency Contact Name" value={form.emergencyName} onChange={e => setForm(p => ({ ...p, emergencyName: e.target.value }))} />
            <Input label="Emergency Contact Phone" value={form.emergencyPhone} onChange={e => setForm(p => ({ ...p, emergencyPhone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Height (cm)" type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))} />
            <Input label="Weight (kg)" type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
          </div>
          <Textarea label="Medical Conditions" value={form.medicalConditions} onChange={e => setForm(p => ({ ...p, medicalConditions: e.target.value }))} rows={3} />
          <Textarea label="Current Medications" value={form.medications} onChange={e => setForm(p => ({ ...p, medications: e.target.value }))} rows={3} />
          <Textarea label="Previous Injuries" value={form.injuries} onChange={e => setForm(p => ({ ...p, injuries: e.target.value }))} rows={3} />

          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" size="lg" loading={saving}>SAVE CHANGES</Button>
            {saved && <span className="text-green-400 font-body text-body-md">✓ Saved successfully</span>}
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <ProfileContent />
      </PageWrapper>
    </AuthGuard>
  );
}
