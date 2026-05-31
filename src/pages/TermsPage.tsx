import { PageWrapper } from '../components/layout/PageWrapper';

export default function TermsPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg text-primary-container uppercase mb-2">Terms & Conditions</h1>
        <p className="font-body text-body-md text-on-surface-variant mb-10">IronHide Fitness | 114C Negombo Rd, Wattala 32350, Sri Lanka</p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">1. Agreement</h2>
            <p className="font-body text-body-md text-on-surface-variant">By registering for or using the IronHide Fitness app or website, you agree to be bound by these Terms and Conditions. If you do not agree, you may not use our services.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">2. Membership</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Memberships are personal and non-transferable. The minimum age to hold a membership is 16 years. You are required to provide accurate and up-to-date information during registration.</p>
              <p>IronHide Fitness reserves the right to refuse or cancel any membership at its discretion. Access to the gym is permitted during opening hours only.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">3. Payments</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Membership fees are due at the start of each billing period. Accepted payment methods include card (via PayHere), bank transfer, and cash at the gym reception.</p>
              <p>Bank transfer and cash payments may take up to 24 hours to activate your membership. All fees are in Sri Lankan Rupees (LKR). We will provide 30 days notice of any fee changes.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">4. Refund Policy</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Membership fees are non-refundable once the membership period has commenced. If you believe a payment error has occurred, contact us within 48 hours at 070 322 2211. Disputes are considered on a case-by-case basis.</p>
              <p>Card payment disputes are handled in accordance with PayHere's refund policy.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">5. Access & Entry</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Gym entry is via face recognition. An active membership is required to gain entry. Tailgating or allowing unauthorised persons to enter is strictly prohibited.</p>
              <p>IronHide Fitness reserves the right to deny entry to any person who has breached these terms.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">6. Lockers</h2>
            <p className="font-body text-body-md text-on-surface-variant">Lockers are assigned for the duration of your active membership. IronHide Fitness is not responsible for the loss or theft of personal belongings. Lockers must be vacated upon membership expiry.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">7. Health & Safety</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>By joining, you confirm that you are in adequate health to participate in gym activities. You accept full responsibility for your health and safety during training.</p>
              <p>IronHide Fitness is not liable for any injury sustained on the premises. You are required to follow all gym rules and safety guidelines, and to disclose any relevant medical conditions prior to training.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">8. Code of Conduct</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p>Members are expected to: respect all staff and fellow members, return equipment after use, wear appropriate attire, avoid causing disturbance with phones, and refrain from any form of aggression.</p>
              <p>Alcohol and drugs are strictly prohibited on the premises. Breach of the code of conduct may result in immediate membership cancellation without refund.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">9. App & Digital Services</h2>
            <p className="font-body text-body-md text-on-surface-variant">The IronHide Fitness app is provided as a convenience tool. We do not guarantee uninterrupted uptime. Features labelled "coming soon" are not guaranteed to be delivered. Push notifications require device permission to be enabled.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">10. Liability</h2>
            <p className="font-body text-body-md text-on-surface-variant">IronHide Fitness is not liable for any loss, damage, or injury except as required by applicable law. Our maximum liability is limited to the membership fee paid for the current billing period.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">11. Changes</h2>
            <p className="font-body text-body-md text-on-surface-variant">We may update these terms at any time. Material changes will be communicated via the app or email. Continued use of our services after notice constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">12. Governing Law</h2>
            <p className="font-body text-body-md text-on-surface-variant">These terms are governed by the laws of Sri Lanka. Any disputes shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">13. Contact</h2>
            <p className="font-body text-body-md text-on-surface-variant">IronHide Fitness<br />114C Negombo Rd, Wattala 32350, Sri Lanka<br />070 322 2211</p>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
