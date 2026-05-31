import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { isBiometricAvailable } from '../lib/biometrics';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface NotificationPrefs {
  expiryReminders: boolean;
  paymentConfirmations: boolean;
  announcements: boolean;
  capacityAlerts: boolean;
}

function SettingsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Change Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Change Email
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Biometric
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    expiryReminders: true,
    paymentConfirmations: true,
    announcements: true,
    capacityAlerts: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  // Data export
  const [showDataExport, setShowDataExport] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'members', user.uid, 'notificationPreferences', 'prefs'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setNotifPrefs({
            expiryReminders: data.expiryReminders ?? true,
            paymentConfirmations: data.paymentConfirmations ?? true,
            announcements: data.announcements ?? true,
            capacityAlerts: data.capacityAlerts ?? true,
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!newPw || newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    if (!user?.email) return;
    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwSuccess('Password updated successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      setPwError('Failed to update password. Check your current password and try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setEmailError('');
    setEmailSuccess('');
    if (!newEmail.trim()) { setEmailError('Please enter a new email address.'); return; }
    if (!user?.email) return;
    setEmailLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPw);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail.trim());
      await sendEmailVerification(user).catch(() => {});
      setEmailSuccess('Verification sent to new email. Please click the link to confirm.');
      setNewEmail(''); setEmailPw('');
    } catch {
      setEmailError('Failed to update email. Check your password and try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    setNotifSuccess('');
    try {
      await setDoc(doc(db, 'members', user.uid, 'notificationPreferences', 'prefs'), notifPrefs, { merge: true });
      setNotifSuccess('Notification preferences saved.');
    } catch {
      // fail silently
    } finally {
      setNotifLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'members', user.uid));
      await deleteUser(user);
      navigate('/');
    } catch {
      setDeleteError('Failed to delete account. You may need to sign out and sign in again before deleting.');
      setDeleteLoading(false);
    }
  };

  const toggleNotif = (key: keyof NotificationPrefs) => {
    setNotifPrefs(p => ({ ...p, [key]: !p[key] }));
    setNotifSuccess('');
  };

  const Toggle = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-border-default last:border-0">
      <span className="font-body text-body-md text-on-surface">{label}</span>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 transition-colors focus:outline-none ${value ? 'bg-primary-container' : 'bg-surface-container-high'}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-on-surface transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`}
          style={{ background: value ? 'white' : '#888' }}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-12">
      <h1 className="font-display text-headline-lg text-on-surface uppercase">Settings</h1>

      {/* Account Section */}
      <section>
        <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Account</h2>

        <div className="space-y-8">
          {/* Change Password */}
          <div className="bg-surface-container p-6 space-y-4 border-t-2 border-primary-container">
            <h3 className="font-display text-on-surface uppercase text-body-lg">Change Password</h3>
            <Input label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
            <Input label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" placeholder="Min 6 characters" />
            <Input label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
            {pwError && <p className="text-error text-body-md font-body">{pwError}</p>}
            {pwSuccess && <p className="text-green-400 text-body-md font-body">{pwSuccess}</p>}
            <Button variant="primary" loading={pwLoading} onClick={handleChangePassword}>Update Password</Button>
          </div>

          {/* Change Email */}
          <div className="bg-surface-container p-6 space-y-4 border-t-2 border-primary-container">
            <h3 className="font-display text-on-surface uppercase text-body-lg">Change Email</h3>
            <Input label="New Email Address" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <Input label="Current Password" type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} autoComplete="current-password" />
            {emailError && <p className="text-error text-body-md font-body">{emailError}</p>}
            {emailSuccess && <p className="text-green-400 text-body-md font-body">{emailSuccess}</p>}
            <Button variant="primary" loading={emailLoading} onClick={handleChangeEmail}>Update Email</Button>
          </div>

          {/* Biometric Login */}
          <div className="bg-surface-container p-6 space-y-3 border-t-2 border-primary-container">
            <h3 className="font-display text-on-surface uppercase text-body-lg">Biometric Login</h3>
            {biometricAvailable === null ? (
              <p className="font-body text-body-md text-on-surface-variant">Checking biometric availability…</p>
            ) : biometricAvailable ? (
              <div className="flex items-center gap-2 text-green-400">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <p className="font-body text-body-md">Face ID / Fingerprint is available on this device</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">cancel</span>
                <p className="font-body text-body-md">Not available on this device</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section>
        <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Notifications</h2>
        <div className="bg-surface-container p-6 border-t-2 border-primary-container space-y-1">
          <Toggle label="Membership expiry reminders" value={notifPrefs.expiryReminders} onToggle={() => toggleNotif('expiryReminders')} />
          <Toggle label="Payment confirmations" value={notifPrefs.paymentConfirmations} onToggle={() => toggleNotif('paymentConfirmations')} />
          <Toggle label="Gym announcements" value={notifPrefs.announcements} onToggle={() => toggleNotif('announcements')} />
          <Toggle label="Capacity alerts" value={notifPrefs.capacityAlerts} onToggle={() => toggleNotif('capacityAlerts')} />
          <div className="pt-4 space-y-2">
            {notifSuccess && <p className="text-green-400 text-body-md font-body">{notifSuccess}</p>}
            <Button variant="primary" loading={notifLoading} onClick={handleSaveNotifications}>Save Preferences</Button>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section>
        <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Privacy</h2>
        <div className="bg-surface-container p-6 border-t-2 border-primary-container space-y-4">
          <div className="space-y-2">
            <Link to="/privacy-policy" className="block text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Privacy Policy</Link>
            <Link to="/cookie-policy" className="block text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Cookie Policy</Link>
            <Link to="/terms" className="block text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Terms & Conditions</Link>
          </div>
          <div className="pt-2 border-t border-border-default">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Data Export</p>
            <Button variant="ghost" onClick={() => setShowDataExport(true)}>Request Data Export</Button>
            {showDataExport && (
              <p className="mt-3 font-body text-body-md text-on-surface-variant">To request a copy of your data contact us at 070 322 2211.</p>
            )}
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Danger Zone</h2>
        <div className="border-2 border-error p-6 space-y-4">
          <div>
            <p className="font-label-sm text-label-sm text-error uppercase tracking-widest mb-1">Delete Account</p>
            <p className="font-body text-body-md text-on-surface-variant">Permanently delete your IronHide account. This cannot be undone.</p>
          </div>
          {!showDeleteConfirm ? (
            <Button variant="primary" onClick={() => setShowDeleteConfirm(true)}>
              <span className="text-error">Delete Account</span>
            </Button>
          ) : (
            <div className="space-y-4 border border-error p-4">
              <p className="font-body text-body-md text-on-surface">
                This will permanently delete your account and cancel your membership. This cannot be undone.
              </p>
              {deleteError && <p className="text-error text-body-md font-body">{deleteError}</p>}
              <div className="flex gap-3 flex-wrap">
                <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}>Cancel</Button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-error text-white font-display uppercase px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting…' : 'DELETE MY ACCOUNT'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <PageWrapper>
        <SettingsContent />
      </PageWrapper>
    </AuthGuard>
  );
}
