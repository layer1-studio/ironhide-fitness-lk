import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { createMember, addPayment, getMembershipPlans } from '../lib/memberService';
import { calculateBMI } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { MembershipPlan } from '../types';

const STEPS = ['Personal Details', 'Health Info', 'Photo Upload', 'Choose Plan', 'Payment'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-12">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 flex items-center justify-center border-2 font-display text-sm ${i < current ? 'bg-primary-container border-primary-container text-on-primary-container' : i === current ? 'border-primary-container text-primary-container' : 'border-surface-container-highest text-on-surface-variant'}`}>
              {i < current ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
            </div>
            <span className="font-label-sm text-label-sm mt-1 text-center hidden md:block text-on-surface-variant">{step}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < current ? 'bg-primary-container' : 'bg-surface-container-highest'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [personal, setPersonal] = useState({ fullName: '', dob: '', gender: '', phone: '', email: '', password: '', address: '', emergencyName: '', emergencyPhone: '' });
  const [health, setHealth] = useState({ height: '', weight: '', medicalConditions: '', medications: '', injuries: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [completed, setCompleted] = useState(false);

  const bmi = health.height && health.weight ? calculateBMI(Number(health.height), Number(health.weight)) : 0;

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await getMembershipPlans();
      setPlans(data.length ? data : [
        { id: '1', name: 'Monthly', duration: '1 month', price: 5000, features: ['24/7 Access', 'Locker Room'], isActive: true },
        { id: '2', name: 'Quarterly', duration: '3 months', price: 13500, features: ['All Monthly Features', 'Guest Passes', 'Trainer Access'], isActive: true },
        { id: '3', name: 'Annual', duration: '12 months', price: 48000, features: ['Unlimited Access', 'PT Sessions', 'Apparel Kit'], isActive: true },
      ]);
    } catch {
      setPlans([
        { id: '1', name: 'Monthly', duration: '1 month', price: 5000, features: ['24/7 Access', 'Locker Room'], isActive: true },
        { id: '2', name: 'Quarterly', duration: '3 months', price: 13500, features: ['All Monthly Features', 'Guest Passes', 'Trainer Access'], isActive: true },
        { id: '3', name: 'Annual', duration: '12 months', price: 48000, features: ['Unlimited Access', 'PT Sessions', 'Apparel Kit'], isActive: true },
      ]);
    } finally {
      setPlansLoading(false);
    }
  };

  const nextStep = async () => {
    if (step === 3 && !plans.length) await loadPlans();
    setStep(s => s + 1);
    setErrors({});
  };
  const prevStep = () => { setStep(s => s - 1); setErrors({}); };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setReceiptFile(file);
  };

  const handleComplete = async () => {
    if (!paymentMethod) { setSubmitError('Please select a payment method.'); return; }
    if (paymentMethod === 'bank_transfer' && !receiptFile) { setSubmitError('Please upload your bank transfer receipt.'); return; }
    setLoading(true);
    setSubmitError('');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, personal.email, personal.password);
      const uid = userCred.user.uid;

      let photoUrl = '';
      if (photoFile) {
        const photoRef = ref(storage, `members/${uid}/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        photoUrl = await getDownloadURL(photoRef);
      }

      let receiptUrl = '';
      if (paymentMethod === 'bank_transfer' && receiptFile) {
        const receiptRef = ref(storage, `members/${uid}/receipts/${Date.now()}.jpg`);
        await uploadBytes(receiptRef, receiptFile);
        receiptUrl = await getDownloadURL(receiptRef);
      }

      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + (selectedPlan ? 1 : 1));

      await createMember(uid, {
        fullName: personal.fullName,
        email: personal.email,
        phone: personal.phone,
        dob: new Date(personal.dob),
        gender: personal.gender,
        address: personal.address,
        emergencyContact: { name: personal.emergencyName, phone: personal.emergencyPhone },
        height: Number(health.height),
        weight: Number(health.weight),
        bmi,
        medicalConditions: health.medicalConditions,
        medications: health.medications,
        injuries: health.injuries,
        photoUrl,
        lockerNumber: '',
        membershipTier: selectedPlan?.name ?? '',
        membershipStatus: paymentMethod === 'card' ? 'pending_verification' : paymentMethod === 'bank_transfer' ? 'pending_verification' : 'pending_cash',
        membershipExpiry: expiry,
      });

      await addPayment(uid, {
        amount: selectedPlan?.price ?? 0,
        plan: selectedPlan?.name ?? '',
        method: paymentMethod,
        status: paymentMethod === 'cash' ? 'pending_cash' : 'pending_verification',
        receiptUrl,
      });

      setCompleted(true);
    } catch {
      setSubmitError('Registration failed. The email may already be in use, or try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-margin-mobile">
        <div className="max-w-lg text-center">
          <span className="material-symbols-outlined text-primary-container text-6xl mb-6 block">check_circle</span>
          <h1 className="font-display text-headline-lg uppercase mb-4">Registration Complete!</h1>
          <p className="text-body-lg text-on-surface-variant font-body mb-8">
            {paymentMethod === 'cash'
              ? 'Please make payment at the gym reception. Your membership will be activated once confirmed.'
              : 'Your application is under review. You will be notified once your membership is activated.'}
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>GO TO DASHBOARD</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-margin-mobile py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="block font-display text-headline-lg text-primary-container mb-12 text-center">IRONHIDE</Link>
        <h1 className="font-display text-headline-md uppercase text-center mb-2">JOIN IRONHIDE</h1>
        <p className="text-body-md text-on-surface-variant text-center font-body mb-8">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        <StepIndicator current={step} />

        <div className="bg-surface-container border-t-2 border-primary-container p-8">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Full Name" value={personal.fullName} onChange={e => setPersonal(p => ({ ...p, fullName: e.target.value }))} error={errors.fullName} placeholder="John Silva" />
                <Input label="Date of Birth" type="date" value={personal.dob} onChange={e => setPersonal(p => ({ ...p, dob: e.target.value }))} error={errors.dob} />
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Gender</label>
                  <select value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))} className="bg-surface-container border border-border-default text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Input label="Phone Number" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} error={errors.phone} placeholder="07X XXX XXXX" />
                <Input label="Email Address" type="email" value={personal.email} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="you@email.com" />
                <Input label="Password" type="password" value={personal.password} onChange={e => setPersonal(p => ({ ...p, password: e.target.value }))} error={errors.password} placeholder="Min 6 characters" />
              </div>
              <Input label="Home Address" value={personal.address} onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} error={errors.address} placeholder="Street, City" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Emergency Contact Name" value={personal.emergencyName} onChange={e => setPersonal(p => ({ ...p, emergencyName: e.target.value }))} placeholder="Contact name" />
                <Input label="Emergency Contact Phone" value={personal.emergencyPhone} onChange={e => setPersonal(p => ({ ...p, emergencyPhone: e.target.value }))} placeholder="07X XXX XXXX" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Health Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="Height (cm)" type="number" value={health.height} onChange={e => setHealth(p => ({ ...p, height: e.target.value }))} placeholder="175" />
                <Input label="Weight (kg)" type="number" value={health.weight} onChange={e => setHealth(p => ({ ...p, weight: e.target.value }))} placeholder="75" />
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">BMI (Auto)</label>
                  <div className="bg-surface-container-high border border-border-default text-on-surface px-4 py-3 font-body text-body-md">
                    {bmi || '—'}
                  </div>
                </div>
              </div>
              <Textarea label="Pre-existing Medical Conditions" value={health.medicalConditions} onChange={e => setHealth(p => ({ ...p, medicalConditions: e.target.value }))} placeholder="List any medical conditions, or write 'None'" rows={3} />
              <Textarea label="Current Medications" value={health.medications} onChange={e => setHealth(p => ({ ...p, medications: e.target.value }))} placeholder="List any medications, or write 'None'" rows={3} />
              <Textarea label="Previous Injuries" value={health.injuries} onChange={e => setHealth(p => ({ ...p, injuries: e.target.value }))} placeholder="List any previous injuries, or write 'None'" rows={3} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Profile Photo</h2>
              <p className="text-body-md text-on-surface-variant font-body">Upload a clear photo of your face for your member profile and face recognition entry.</p>
              <div className="flex flex-col items-center gap-6">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-48 h-48 object-cover border-4 border-primary-container" />
                ) : (
                  <div className="w-48 h-48 bg-surface-container-high border-2 border-border-default flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-6xl">person</span>
                  </div>
                )}
                <label className="cursor-pointer bg-primary-container text-on-primary-container px-6 py-3 font-display text-body-md uppercase hover:scale-105 transition-all">
                  {photoFile ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                {photoFile && <p className="text-label-sm text-on-surface-variant font-body">{photoFile.name}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Choose Your Plan</h2>
              {plansLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-6 border-2 cursor-pointer transition-all ${selectedPlan?.id === plan.id ? 'border-primary-container bg-surface-container-high' : 'border-border-default bg-surface-container hover:border-primary-container'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-display text-headline-md uppercase">{plan.name}</h3>
                          <p className="text-body-md text-on-surface-variant font-body">{plan.duration}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-headline-md text-primary-container">LKR {plan.price.toLocaleString()}</span>
                        </div>
                      </div>
                      <ul className="mt-4 grid grid-cols-2 gap-2">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-body-md text-on-surface-variant font-body">
                            <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Payment</h2>
              {selectedPlan && (
                <div className="bg-surface-container-high p-4 border-l-4 border-primary-container">
                  <p className="font-body text-body-md text-on-surface-variant">Selected Plan:</p>
                  <p className="font-display text-headline-md">{selectedPlan.name} — LKR {selectedPlan.price.toLocaleString()}</p>
                </div>
              )}
              <div className="space-y-4">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Select Payment Method</p>
                {([
                  { method: 'card' as const, icon: 'credit_card', label: 'Credit/Debit Card', desc: 'Pay securely via PayHere' },
                  { method: 'bank_transfer' as const, icon: 'account_balance', label: 'Bank Transfer', desc: 'Upload receipt for verification' },
                  { method: 'cash' as const, icon: 'payments', label: 'Cash at Gym', desc: 'Pay at reception' },
                ]).map(opt => (
                  <div
                    key={opt.method}
                    onClick={() => setPaymentMethod(opt.method)}
                    className={`p-4 border-2 cursor-pointer flex items-center gap-4 transition-all ${paymentMethod === opt.method ? 'border-primary-container bg-surface-container-high' : 'border-border-default hover:border-primary-container'}`}
                  >
                    <span className="material-symbols-outlined text-primary-container text-3xl">{opt.icon}</span>
                    <div>
                      <p className="font-display text-headline-md">{opt.label}</p>
                      <p className="text-body-md text-on-surface-variant font-body">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-4 border border-border-default p-4">
                  <p className="font-body text-body-md text-on-surface-variant">Bank: Commercial Bank of Ceylon<br />Account: 8001234567<br />Name: IronHide Fitness (Pvt) Ltd</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-surface-container text-on-surface px-4 py-2 border border-border-default hover:border-primary-container transition-all">
                    <span className="material-symbols-outlined">upload</span>
                    <span className="font-body text-body-md">{receiptFile ? receiptFile.name : 'Upload Receipt'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} />
                  </label>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="border border-yellow-600 bg-yellow-600/10 p-4">
                  <p className="text-body-md font-body text-yellow-400">Please make payment at the gym reception at 114C Negombo Rd, Wattala. Your membership will be activated once payment is confirmed.</p>
                </div>
              )}

              {submitError && <p className="text-error text-body-md font-body">{submitError}</p>}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-border-default">
            {step > 0 ? (
              <Button variant="ghost" onClick={prevStep}>← BACK</Button>
            ) : (
              <Link to="/login" className="text-on-surface-variant hover:text-on-surface text-body-md font-body self-center">Already a member?</Link>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={nextStep}>NEXT →</Button>
            ) : (
              <Button variant="primary" loading={loading} onClick={handleComplete}>COMPLETE REGISTRATION</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
