import { PageWrapper } from '../components/layout/PageWrapper';

export default function RefundPolicyPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg text-primary-container uppercase mb-2">Refund Policy</h1>
        <p className="font-body text-body-md text-on-surface-variant mb-10">IronHide Fitness | 114C Negombo Rd, Wattala 32350, Sri Lanka</p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">General Policy</h2>
            <p className="font-body text-body-md text-on-surface-variant">Membership fees are non-refundable once the membership period has commenced. By completing your registration and payment, you acknowledge and accept this policy.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">Exceptions</h2>
            <div className="space-y-4 font-body text-body-md text-on-surface-variant">
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Payment Error</p>
                <p>If you believe an error occurred during payment, contact us within 48 hours at 070 322 2211. Errors are considered on a case-by-case basis.</p>
              </div>
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Duplicate Payment</p>
                <p>If a duplicate payment is confirmed, a full refund will be issued within 7 business days.</p>
              </div>
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Gym Closure</p>
                <p>If the gym is closed for more than 7 consecutive days due to circumstances beyond your control, a pro-rata refund will be issued for the affected period.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">Refund Processing</h2>
            <div className="space-y-3 font-body text-body-md text-on-surface-variant">
              <p><strong className="text-on-surface">Card payments</strong> are subject to PayHere's refund terms and processing timelines.</p>
              <p><strong className="text-on-surface">Bank transfer and cash refunds</strong> are processed via bank transfer within 14 business days of approval. You will be required to provide bank account details.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">Contact</h2>
            <p className="font-body text-body-md text-on-surface-variant">To request a refund or report a payment issue, contact us at 070 322 2211 or visit 114C Negombo Rd, Wattala 32350, Sri Lanka.</p>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
