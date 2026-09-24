import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, deleteUser } from 'firebase/auth';
import { initiateStripeCheckout } from '../lib/stripe';
import { initiateHnbCheckout } from '../lib/hnbipg';
import { ReCaptcha } from '../components/ui/ReCaptcha';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { db } from '../lib/firebase';
import { createMember, addPayment, getMembershipPlans, callSendSecondaryMemberInvite } from '../lib/memberService';
import { doc, updateDoc } from 'firebase/firestore';
import { calculateBMI, isValidEmail, isStrongPassword } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { MembershipPlan } from '../types';

const BASE_STEPS = ['Personal Details', 'Health Info', 'Photo Upload', 'Choose Plan', 'Payment'];
const COUPLE_STEPS = ['Personal Details', 'Health Info', 'Photo Upload', 'Choose Plan', 'Secondary Member Email', 'Payment'];

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 flex items-center justify-center border-2 font-display text-sm ${i < current ? 'bg-primary-container border-primary-container text-on-primary-container' : i === current ? 'border-primary-container text-primary-container' : 'border-surface-container-highest text-on-surface-variant'}`}>
              {i < current ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
            </div>
            <span className="font-label-sm text-label-sm mt-1 text-center hidden md:block text-on-surface-variant">{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < current ? 'bg-primary-container' : 'bg-surface-container-highest'}`} />}
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

  const [personal, setPersonal] = useState({
    fullName: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    legacyMembershipId: '',
    transportMode: '',
  });
  const [health, setHealth] = useState({ height: '', weight: '', medicalConditions: '', medications: '', injuries: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'hnb_ipg' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Couple plan — secondary member's email only (they self-register via invite link)
  const [secondaryEmail, setSecondaryEmail] = useState('');


  const bmi = health.height && health.weight ? calculateBMI(Number(health.height), Number(health.weight)) : 0;

  const isCouple = selectedPlan?.name === 'Annual — Couple';
  const steps = isCouple ? COUPLE_STEPS : BASE_STEPS;
  const currentStepName = steps[step];

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await getMembershipPlans();
      setPlans(data.length ? data : [
        { id: '1', name: 'Daily', duration: '1 day', price: 2500, features: ['24/7 Access', 'Locker Room'], isActive: true },
        { id: '2', name: 'Monthly', duration: '1 month', price: 15000, features: ['24/7 Access', 'Locker Room', 'Standard Equipment'], isActive: true },
        { id: '3', name: 'Annual', duration: '12 months', price: 165000, features: ['Unlimited Access', 'PT Sessions', 'Apparel Kit', 'VIP Lounge'], isActive: true },
        { id: '4', name: 'Annual — Couple', duration: '12 months', price: 310000, features: ['Everything in Annual', 'Partner Account Included', 'Shared Expiry'], isActive: true },
      ]);
    } catch {
      setPlans([
        { id: '1', name: 'Daily', duration: '1 day', price: 2500, features: ['24/7 Access', 'Locker Room'], isActive: true },
        { id: '2', name: 'Monthly', duration: '1 month', price: 15000, features: ['24/7 Access', 'Locker Room', 'Standard Equipment'], isActive: true },
        { id: '3', name: 'Annual', duration: '12 months', price: 165000, features: ['Unlimited Access', 'PT Sessions', 'Apparel Kit', 'VIP Lounge'], isActive: true },
        { id: '4', name: 'Annual — Couple', duration: '12 months', price: 310000, features: ['Everything in Annual', 'Partner Account Included', 'Shared Expiry'], isActive: true },
      ]);
    } finally {
      setPlansLoading(false);
    }
  };

  const validateStep = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (currentStepName === 'Personal Details') {
      if (!personal.fullName.trim()) errs.fullName = 'Full name is required';
      else if (personal.fullName.trim().length < 2) errs.fullName = 'Enter your full name';
      if (!personal.dob) errs.dob = 'Date of birth is required';
      else {
        const age = (Date.now() - new Date(personal.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 16) errs.dob = 'You must be at least 16 years old';
        if (age > 100) errs.dob = 'Please enter a valid date of birth';
      }
      if (!personal.gender) errs.gender = 'Please select a gender';
      if (!personal.phone.trim()) errs.phone = 'Phone number is required';
      else if (!/^0\d{9}$/.test(personal.phone.replace(/\s/g, ''))) errs.phone = 'Enter a valid Sri Lanka number (07X XXXXXXX)';
      if (!personal.email.trim()) errs.email = 'Email is required';
      else if (!isValidEmail(personal.email)) errs.email = 'Enter a valid email address';
      if (!personal.password) errs.password = 'Password is required';
      else if (!isStrongPassword(personal.password)) errs.password = 'Use at least 8 characters including uppercase, lowercase, number, and symbol';
      if (!personal.confirmPassword) errs.confirmPassword = 'Please confirm your password';
      else if (personal.password !== personal.confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (!personal.address.trim()) errs.address = 'Home address is required';
      if (!personal.transportMode) errs.transportMode = 'Please select your usual transport';
    }

    if (currentStepName === 'Choose Plan' && !selectedPlan) {
      errs.plan = 'Please select a membership plan';
    }

    if (currentStepName === 'Secondary Member Email') {
      if (!secondaryEmail.trim()) errs.secondaryEmail = 'Secondary member email is required';
      else if (!isValidEmail(secondaryEmail)) errs.secondaryEmail = 'Enter a valid email address';
      else if (secondaryEmail.trim().toLowerCase() === personal.email.trim().toLowerCase()) errs.secondaryEmail = 'Secondary member must have a different email address';
    }

    return errs;
  };

  const nextStep = async () => {
    const errs = validateStep();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (currentStepName === 'Photo Upload' && !plans.length) await loadPlans();
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
    if (!privacyAccepted) { setSubmitError('Please accept the data privacy statement to continue.'); return; }
    if (!paymentMethod) { setSubmitError('Please select a payment method.'); return; }
    if (paymentMethod === 'bank_transfer' && !receiptFile) { setSubmitError('Please upload your bank transfer receipt.'); return; }
    if (paymentMethod === 'hnb_ipg' && !recaptchaToken) { setSubmitError('Please complete the security check (reCAPTCHA) before proceeding.'); return; }

    setLoading(true);
    setSubmitError('');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, personal.email.trim(), personal.password);
      const uid = userCred.user.uid;
      try {
        await sendEmailVerification(userCred.user);
      } catch (emailErr) {
        console.error('[SignupPage] sendEmailVerification error:', emailErr);
        setSubmitError('Could not send verification email. If running locally, the Firebase Auth emulator does not send real emails.');
      }

      let photoUrl = '';
      if (photoFile) {
        const photoRef = ref(storage, `members/${uid}/profile.jpg`);
        await uploadBytes(photoRef, photoFile);
        photoUrl = await getDownloadURL(photoRef);
      }

      const dispatchCoupleInvite = async (membershipExpiry: Date) => {
        if (!isCouple || !secondaryEmail.trim()) return;
        try {
          await callSendSecondaryMemberInvite({
            primaryUid: uid,
            secondaryEmail: secondaryEmail.trim(),
            primaryName: personal.fullName,
            plan: selectedPlan?.name ?? 'Annual — Couple',
            membershipExpiry: membershipExpiry.toISOString(),
          });
        } catch (inviteErr) {
          console.warn('[SignupPage] Couple invite email failed (non-fatal):', inviteErr);
        }
      };

      // Card Payment — Stripe
      if (paymentMethod === 'card') {
        try {
          if (!selectedPlan) throw new Error('No membership plan selected');

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
            membershipTier: selectedPlan.name,
            membershipStatus: 'pending_verification',   // Stripe webhook will set to 'active'
            membershipExpiry: new Date(),                // Stripe webhook will set correct expiry
          });

          await updateDoc(doc(db, 'members', uid), {
            legacyMembershipId: personal.legacyMembershipId,
            transportMode: personal.transportMode,
          });

          // For Stripe card payments, the couple invite is sent from the webhook after payment succeeds.
          // Store secondaryEmail on the member doc so the webhook can read it.
          if (isCouple && secondaryEmail.trim()) {
            await updateDoc(doc(db, 'members', uid), { secondaryMemberEmail: secondaryEmail.trim() });
          }

          console.log('[SignupPage] Initiating Stripe checkout for uid:', uid);
          await initiateStripeCheckout({
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            amount: selectedPlan.price,
            uid,
          });
          // Execution stops here (user redirected to Stripe)
          return;
        } catch (stripeErr: any) {
          console.error('[SignupPage] Card payment error:', stripeErr?.message || stripeErr);
          if (stripeErr?.message?.includes('checkout URL') || stripeErr?.message?.includes('failed to load')) {
            throw new Error('Could not connect to payment gateway. Please check your internet connection and try again.');
          } else if (stripeErr?.message?.includes('No checkout URL') || stripeErr?.message?.includes('createStripeCheckoutSession')) {
            throw new Error('Payment gateway is temporarily unavailable. Please try again in a few moments.');
          } else {
            throw new Error(stripeErr?.message || 'Failed to initiate payment. Please check your connection and try again.');
          }
        }
      }
       // Card Payment — HNB IPG (CyberSource)
      if (paymentMethod === 'hnb_ipg') {
        try {
          if (!selectedPlan) throw new Error('No membership plan selected');

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
            membershipTier: selectedPlan.name,
            membershipStatus: 'pending_verification',   // hnbIpgWebhook will set to 'active'
            membershipExpiry: new Date(),                // hnbIpgWebhook will set correct expiry
          });
          await updateDoc(doc(db, 'members', uid), {
            legacyMembershipId: personal.legacyMembershipId,
            transportMode: personal.transportMode,
            ...(isCouple && secondaryEmail.trim() ? { secondaryMemberEmail: secondaryEmail.trim() } : {}),
          });

          console.log('[SignupPage] Initiating HNB IPG checkout for uid:', uid);
          await initiateHnbCheckout({
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            amount: selectedPlan.price,
            uid,
            recaptchaToken,
            billToName: personal.fullName,
            billToAddress: personal.address,
            billToPhone: personal.phone,
          });
          // Execution stops here (user redirected to CyberSource)
          return;
        } catch (hnbErr: any) {
          console.error('[SignupPage] HNB IPG payment error:', hnbErr?.message || hnbErr);
          throw new Error(hnbErr?.message || 'Failed to initiate HNB payment. Please check your connection and try again.');
        }
      }

      // Bank Transfer or Cash Payment
      let receiptUrl = '';
      if (paymentMethod === 'bank_transfer' && receiptFile) {
        const receiptRef = ref(storage, `members/${uid}/receipts/${Date.now()}.jpg`);
        await uploadBytes(receiptRef, receiptFile);
        receiptUrl = await getDownloadURL(receiptRef);
      }

      const now = new Date();
      const expiry = new Date(now);
      const months = selectedPlan?.name === 'Annual — Couple' || selectedPlan?.name === 'Annual' ? 12 : 1;
      expiry.setMonth(expiry.getMonth() + months);
      if (selectedPlan?.name === 'Annual — Couple' || selectedPlan?.name === 'Annual') {
        expiry.setDate(expiry.getDate() - 1);
      }

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
        membershipStatus: paymentMethod === 'bank_transfer' ? 'pending_verification' : 'pending_cash',
        membershipExpiry: expiry,
      });

      await updateDoc(doc(db, 'members', uid), {
        legacyMembershipId: personal.legacyMembershipId,
        transportMode: personal.transportMode,
        ...(isCouple && secondaryEmail.trim() ? { secondaryMemberEmail: secondaryEmail.trim() } : {}),
      });

      await addPayment(uid, {
        amount: selectedPlan?.price ?? 0,
        plan: selectedPlan?.name ?? '',
        method: paymentMethod,
        status: paymentMethod === 'cash' ? 'pending_cash' : 'pending_verification',
        receiptUrl,
      });

      // Send couple invite email for bank_transfer and cash (card is handled by Stripe webhook)
      await dispatchCoupleInvite(expiry);

      setCompleted(true);
      navigate('/verify-email');
    } catch (err: any) {
      console.error('[SignupPage] Registration error:', err?.message || err);
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('[SignupPage] Deleting user account due to registration failure:', currentUser.uid);
          await deleteUser(currentUser);
          console.log('[SignupPage] User account deleted successfully');
        }
      } catch (deleteErr: any) {
        console.error('[SignupPage] Failed to delete user account on error:', deleteErr?.message || deleteErr);
      }

      if (err?.message?.includes('Payment gateway')) {
        setSubmitError(err.message);
      } else if (err?.message?.includes('Could not connect')) {
        setSubmitError('Failed to connect to payment gateway. Please check your internet connection and try again.');
      } else if (err?.message?.includes('upload')) {
        setSubmitError('Failed to upload files. Please check your internet connection and try again.');
      } else {
        setSubmitError('Registration failed. Please try again with a different email or contact support if the problem persists.');
      }
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
          <p className="text-body-lg text-on-surface-variant font-body mb-6">
            {paymentMethod === 'card'
              ? 'You have been redirected to complete payment securely via Stripe. After payment is confirmed, your membership will be activated automatically.'
              : paymentMethod === 'cash'
              ? 'Please make payment at the gym reception. Your membership will be activated once confirmed.'
              : 'Your bank transfer receipt has been received. Your membership will be activated once we verify payment. You will be notified within 24 hours.'}
          </p>
          {isCouple && secondaryEmail && (
            <div className="border border-primary-container/40 bg-surface-container-high p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                <p className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Couple Plan — Invite Sent</p>
              </div>
              <p className="font-body text-body-md text-on-surface-variant">
                An invitation email has been sent to <strong>{secondaryEmail}</strong>. Your partner will receive a link to set up their own account.
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>GO TO DASHBOARD</Button>
            <p className="text-body-md text-on-surface-variant font-body">
              You can view your payment status and membership details in your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-margin-mobile py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="block font-display text-headline-lg text-primary-container mb-12 text-center">IRONHIDE FITNESS</Link>
        <h1 className="font-display text-headline-md uppercase text-center mb-2">JOIN IRONHIDE FITNESS</h1>
        <p className="text-body-md text-on-surface-variant text-center font-body mb-8">Step {step + 1} of {steps.length} — {currentStepName}</p>
        <StepIndicator current={step} steps={steps} />

        <div className="bg-surface-container border-t-2 border-primary-container p-8">
          {currentStepName === 'Personal Details' && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Full Name" value={personal.fullName} onChange={e => setPersonal(p => ({ ...p, fullName: e.target.value }))} error={errors.fullName} placeholder="John Silva" />
                <Input label="Date of Birth" type="date" value={personal.dob} onChange={e => setPersonal(p => ({ ...p, dob: e.target.value }))} error={errors.dob} />
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Gender</label>
                  <select value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))} className={`bg-surface-container border text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container ${errors.gender ? 'border-error' : 'border-border-default'}`}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <span className="text-error text-label-sm">{errors.gender}</span>}
                </div>
                <Input label="Phone Number" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} error={errors.phone} placeholder="07X XXX XXXX" />
                <Input label="Email Address" type="email" value={personal.email} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="you@email.com" />
                <Input label="Password" type="password" value={personal.password} onChange={e => setPersonal(p => ({ ...p, password: e.target.value }))} error={errors.password} placeholder="Min 8 characters" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" />
                <Input label="Confirm Password" type="password" value={personal.confirmPassword} onChange={e => setPersonal(p => ({ ...p, confirmPassword: e.target.value }))} error={errors.confirmPassword} placeholder="Re-enter password" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" />
              </div>
              <Input label="Home Address" value={personal.address} onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} error={errors.address} placeholder="Street, City" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Emergency Contact Name" value={personal.emergencyName} onChange={e => setPersonal(p => ({ ...p, emergencyName: e.target.value }))} placeholder="Contact name" />
                <Input label="Emergency Contact Phone" value={personal.emergencyPhone} onChange={e => setPersonal(p => ({ ...p, emergencyPhone: e.target.value }))} placeholder="07X XXX XXXX" />
              </div>
              <Input label="Previous Membership Number (optional)" value={personal.legacyMembershipId} onChange={e => setPersonal(p => ({ ...p, legacyMembershipId: e.target.value.slice(0, 20) }))} placeholder="Enter if you were a previous member" />
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">How do you usually travel to the gym?</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {(['Car', 'Motorbike', 'Bicycle', 'Walk', 'Public Transport'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => setPersonal(p => ({ ...p, transportMode: mode }))}
                      className={`py-3 px-4 border text-body-md font-body transition-all ${personal.transportMode === mode ? 'border-primary-container bg-surface-container-high text-on-surface' : 'border-border-default text-on-surface-variant hover:border-primary-container'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
                {errors.transportMode && <span className="text-error text-label-sm">{errors.transportMode}</span>}
              </div>
            </div>
          )}

          {currentStepName === 'Health Info' && (
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

          {currentStepName === 'Photo Upload' && (
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
              <div className="border border-border-default p-4 space-y-3">
                <p className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Face Recognition Entry</p>
                <p className="font-body text-body-md text-on-surface-variant">Your profile photo will be used to enroll you in the gym's face recognition entry system.</p>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <p className="font-label-sm text-label-sm uppercase tracking-widest">Enrollment processed after membership activation</p>
                </div>
              </div>
            </div>
          )}

          {currentStepName === 'Choose Plan' && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Choose Your Plan</h2>
              {errors.plan && <p className="text-error text-body-md font-body">{errors.plan}</p>}
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

          {currentStepName === 'Secondary Member Email' && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Secondary Member</h2>
              <div className="border border-primary-container/30 bg-surface-container-high p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>people</span>
                  <p className="font-display text-body-lg uppercase tracking-wide text-primary-container">Annual — Couple Plan</p>
                </div>
                <p className="font-body text-body-md text-on-surface-variant">
                  Your couple plan covers <strong>two members</strong>. Enter your partner's email address below. After you complete payment, they'll receive an email with a link to <strong>create their own account</strong> — no extra payment needed.
                </p>
              </div>
              <Input
                label="Secondary Member's Email Address"
                type="email"
                value={secondaryEmail}
                onChange={e => setSecondaryEmail(e.target.value)}
                error={errors.secondaryEmail}
                placeholder="partner@email.com"
              />
              <div className="border border-border-default p-4 space-y-3">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">What happens next?</p>
                <ul className="space-y-2">
                  {[
                    'You complete payment — this covers both members.',
                    'An invitation email is sent to the address above.',
                    'Your partner clicks the link to set up their own account and fill in their details.',
                    'Both accounts share the same membership expiry.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-body-md text-on-surface-variant font-body">
                      <span className="w-5 h-5 flex items-center justify-center bg-primary-container text-on-primary-container text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {currentStepName === 'Payment' && (
            <div className="space-y-6">
              <h2 className="font-display text-headline-md uppercase">Payment</h2>
              {selectedPlan && (
                <div className="bg-surface-container-high p-4 border-l-4 border-primary-container">
                  <p className="font-body text-body-md text-on-surface-variant">Selected Plan:</p>
                  <p className="font-display text-headline-md">{selectedPlan.name} — LKR {selectedPlan.price.toLocaleString()}</p>
                  {isCouple && (
                    <p className="font-body text-body-md text-on-surface-variant mt-1">
                      Covers you + <strong>{secondaryEmail || 'your partner'}</strong> — one payment.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-4">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Select Payment Method</p>
                {([
                  { method: 'card' as const, icon: 'credit_card', label: 'Credit/Debit Card', desc: 'Pay securely via Stripe' },
                  { method: 'hnb_ipg' as const,       icon: 'credit_card',     label: 'Credit / Debit Card', desc: 'Pay securely via HNB IPG',         badge: 'HNB IPG' },
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

              {paymentMethod === 'card' && (
                <div className="border border-green-600 bg-green-600/10 p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-400 text-xl shrink-0">shield</span>
                  <div className="space-y-2">
                    <p className="font-label-sm text-label-sm text-green-400 uppercase tracking-widest">Secure Checkout via Stripe</p>
                    <p className="font-body text-body-md text-on-surface-variant">
                      You'll be securely redirected to Stripe's checkout page. Your card details are encrypted and never stored by IronHide Fitness.
                    </p>
                    <p className="font-body text-body-md text-on-surface-variant">
                      <strong>After payment:</strong> You'll return here, and your membership will be activated automatically within a few moments.
                    </p>
                  </div>
                </div>
              )}

              {/* HNB IPG info panel + mandatory reCAPTCHA v2 */}
              {paymentMethod === 'hnb_ipg' && (
                <div className="space-y-4">
                  <div className="border border-border-default p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary-container text-xl shrink-0">lock</span>
                    <div className="space-y-2">
                      <p className="font-label-sm text-label-sm text-on-surface uppercase tracking-widest">Secure Checkout via HNB IPG (CyberSource)</p>
                      <p className="font-body text-body-md text-on-surface-variant">
                        You'll be securely redirected to HNB's payment page powered by CyberSource.
                        Your card details are processed using Point-to-Point Encryption (P2PE) and are never stored by IronHide Fitness.
                      </p>
                      <p className="font-body text-body-md text-on-surface-variant">
                        Supported cards: Visa, Mastercard, UnionPay &amp; Amex. Once payment is confirmed, your membership will be activated automatically.
                      </p>
                    </div>
                  </div>
                  {/* reCAPTCHA v2 — mandatory per HNB IPG Terms & Conditions */}
                  <div className="space-y-2">
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Security Check (Required)</p>
                    <ReCaptcha
                      onVerify={(token: string) => setRecaptchaToken(token)}
                      onExpire={() => setRecaptchaToken('')}
                    />
                    {recaptchaToken && (
                      <p className="font-body text-body-sm text-green-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Security check passed
                      </p>
                    )}
                  </div>
                </div>
              )}


              {paymentMethod === 'cash' && (
                <div className="border border-yellow-600 bg-yellow-600/10 p-4">
                  <p className="text-body-md font-body text-yellow-400">Please make payment at the gym reception at 114C Negombo Rd, Wattala. Your membership will be activated once payment is confirmed.</p>
                </div>
              )}

              <div className="border border-border-default p-4 space-y-3">
                <p className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Data Privacy Statement</p>
                <p className="font-body text-body-md text-on-surface-variant">
                  IronHide Fitness collects and stores your personal information (name, contact details, date of birth, health data, and profile photo) solely for the purpose of managing your gym membership, ensuring your safety during training, and communicating gym updates with you.
                </p>
                <p className="font-body text-body-md text-on-surface-variant">
                  Your data is stored securely and will not be shared with third parties without your consent, except where required by law. You may request access to, correction of, or deletion of your data at any time by contacting the gym management.
                </p>
                <p className="font-body text-body-md text-on-surface-variant">
                  Health information (medical conditions, medications, injuries) is collected to protect your safety and will only be accessed by authorised staff. By registering, you consent to this data being held for the duration of your membership and for a period of 2 years thereafter.
                  {isCouple && ' This also applies to the health information you\'ve provided on behalf of your partner.'}
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={e => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 accent-[#cc0000] w-4 h-4 shrink-0"
                  />
                  <span className="font-body text-body-md text-on-surface">
                    I have read and agree to the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary-container hover:underline">Terms & Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-container hover:underline">Privacy Policy</a>.
                    {' '}I consent to IronHide Fitness collecting and processing my personal and health data as described{isCouple ? ', including on behalf of my partner' : ''}.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="border border-error bg-error/10 p-4 space-y-2">
                  <p className="text-error text-body-md font-body">{submitError}</p>
                  {submitError.includes('already registered') && (
                    <Link to="/login" className="inline-flex items-center gap-2 text-primary-container hover:underline font-body text-body-md">
                      Go to Login <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-border-default">
            {step > 0 ? (
              <Button variant="ghost" onClick={prevStep}>← BACK</Button>
            ) : (
              <Link to="/login" className="text-on-surface-variant hover:text-on-surface text-body-md font-body self-center">Already a member?</Link>
            )}
            {step < steps.length - 1 ? (
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