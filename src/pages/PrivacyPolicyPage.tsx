import { PageWrapper } from '../components/layout/PageWrapper';

export default function PrivacyPolicyPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg text-primary-container uppercase mb-2">Privacy Policy</h1>
        <p className="font-body text-body-md text-on-surface-variant mb-2">IronHide Fitness | 114C Negombo Rd, Wattala 32350, Sri Lanka | 070 322 2211</p>
        <p className="font-body text-body-md text-on-surface-variant mb-10">Last updated: June 2026</p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">1. Who We Are</h2>
            <p className="font-body text-body-md text-on-surface-variant">IronHide Fitness operates the IronHide Fitness mobile app and website. This policy explains what personal data we collect, why we collect it, and how we protect it.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">2. What Data We Collect</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p><strong className="text-on-surface">Personal:</strong> Full name, date of birth, gender, phone, email, address, emergency contact, and profile photo.</p>
              <p><strong className="text-on-surface">Health:</strong> Height, weight, BMI, medical conditions, medications, and injuries.</p>
              <p><strong className="text-on-surface">Biometric:</strong> Facial recognition for gym entry (hardware only, not stored in the app). Device biometrics for app login never leave your device.</p>
              <p><strong className="text-on-surface">Payment:</strong> Membership plan, payment method, payment history, and bank receipts. Card data is processed by PayHere only — we do not store card details.</p>
              <p><strong className="text-on-surface">Usage:</strong> Workout logs, body metrics, login timestamps, FCM token, and device information.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">3. Why We Collect Your Data</h2>
            <p className="font-body text-body-md text-on-surface-variant">We use your data for: membership management, identity verification at gym entry, payment processing, membership expiry reminders, locker management, fitness tracking, gym announcements, member support, and compliance with legal obligations.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">4. How We Store Your Data</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Your data is stored on Google Firebase, hosted in Mumbai, India (asia-south1 region). Profile photos and receipts are stored in Firebase Storage, with access restricted to your account.</p>
              <p>Facial recognition data is stored on gym hardware only and never transferred to our app or cloud. Device biometrics remain on your device only.</p>
              <p>All data is protected with industry-standard encryption in transit and at rest.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">5. Who We Share Your Data With</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>We do not sell your data to third parties. Your data may be shared with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Firebase (Google) for database, authentication, and storage services</li>
                <li>PayHere for card payment processing</li>
                <li>Gym staff for operational membership access only</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">6. Retention</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Active member data is retained for the duration of your membership plus 2 years. Payment records are retained for 7 years in compliance with financial regulations.</p>
              <p>On account deletion, personal data is deleted within 30 days except where retention is required by legal obligation.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">7. Your Rights</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>You have the right to access, correct, or delete your personal data. You may withdraw consent for marketing communications at any time. You may also lodge a complaint with the relevant data protection authority.</p>
              <p>To exercise your rights, contact us at 070 322 2211 or visit 114C Negombo Rd, Wattala.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">8. Children</h2>
            <p className="font-body text-body-md text-on-surface-variant">Our services are not directed at persons under 16 years of age. We do not knowingly collect personal data from anyone under 16.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">9. Changes to This Policy</h2>
            <p className="font-body text-body-md text-on-surface-variant">We will notify you via the app or email of any significant changes to this policy. Continued use of our services after notification constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">10. Contact</h2>
            <p className="font-body text-body-md text-on-surface-variant">IronHide Fitness<br />114C Negombo Rd, Wattala 32350, Sri Lanka<br />070 322 2211</p>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
