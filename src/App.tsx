import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { AuthGuard } from './components/layout/AuthGuard';
import { AdminGuard } from './components/layout/AdminGuard';
import { AdminPageWrapper } from './components/layout/AdminPageWrapper';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminCashManagementPage from './pages/admin/Cashmanagementtab';
import AdminMembershipsPage from './pages/admin/AdminMembershipsPage';
import AdminStaffPage from './pages/admin/StaffrosterPage';
import AdminAttendancePage from './pages/admin/AttendancePage';
import LandingPage from './pages/LandingPage';
import FacilitiesPage from './pages/FacilitiesPage';
import MembershipPage from './pages/MembershipPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PaymentResultPage from './pages/PaymentResultPage';
import DashboardPage from './pages/DashboardPage';
import RenewPage from './pages/RenewPage';
import PaymentsPage from './pages/PaymentsPage';
import ProfilePage from './pages/ProfilePage';
import IdCardPage from './pages/IdCardPage';
import OccupancyPage from './pages/OccupancyPage';
import FitnessPage from './pages/FitnessPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import HelpPage from './pages/HelpPage';
import SettingsPage from './pages/SettingsPage';
import StaffParkingPage from './pages/StaffParkingPage';
import SecondaryMemberSetupPage from './pages/SecondaryMemberSetupPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/payment-success" element={<PaymentResultPage success />} />
            <Route path="/payment-failed" element={<PaymentResultPage success={false} />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/renew" element={<RenewPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/id-card" element={<IdCardPage />} />
            <Route path="/occupancy" element={<OccupancyPage />} />
            <Route path="/fitness" element={<FitnessPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/staff/parking" element={<StaffParkingPage />} />
            <Route path="/secondary-setup" element={<SecondaryMemberSetupPage />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/admin" element={<AuthGuard><AdminGuard><AdminPageWrapper /></AdminGuard></AuthGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="staff/attendance" element={<AdminAttendancePage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="cash-management" element={<AdminCashManagementPage />} />
              <Route path="memberships" element={<AdminMembershipsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
