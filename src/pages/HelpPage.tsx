import type { ReactNode } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';

function QA({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <div className="border-b border-border-default pb-5 last:border-0">
      <p className="font-display text-body-lg text-on-surface uppercase mb-2">{question}</p>
      <div className="font-body text-body-md text-on-surface-variant">{answer}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg text-primary-container uppercase mb-2">Help & FAQ</h1>
        <p className="font-body text-body-md text-on-surface-variant mb-10">Answers to common questions about IronHide Fitness.</p>

        <div className="space-y-12">
          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Getting Started</h2>
            <div className="space-y-5">
              <QA
                question="How do I join IronHide?"
                answer={
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>Click "Join Now" on the homepage or visit the app</li>
                    <li>Fill in your personal and health details</li>
                    <li>Upload a profile photo</li>
                    <li>Choose a membership plan</li>
                    <li>Complete your payment — you'll receive a confirmation once your membership is activated</li>
                  </ol>
                }
              />
              <QA
                question="How long does activation take?"
                answer="Card payments are activated instantly. Bank transfers and cash payments may take up to 24 hours to be verified and activated."
              />
              <QA
                question="What is the minimum age to join?"
                answer="You must be at least 16 years old to hold an IronHide Fitness membership."
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Entry & Access</h2>
            <div className="space-y-5">
              <QA
                question="How do I enter the gym?"
                answer="Gym entry is via face recognition. Stand in front of the entry scanner and your membership will be verified automatically."
              />
              <QA
                question="What if face recognition doesn't work?"
                answer="If you have trouble with face recognition, speak to the reception team — they can verify your membership manually."
              />
              <QA
                question="Can I bring a guest?"
                answer="Guest access is not available through the app. Contact reception to enquire about guest arrangements."
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Payments & Membership</h2>
            <div className="space-y-5">
              <QA
                question="When can I renew my membership?"
                answer="You can renew your membership up to 7 days before your current membership expires. You'll find the Renew option in your Dashboard."
              />
              <QA
                question="What payment methods are accepted?"
                answer="We accept credit/debit card (via PayHere), bank transfer, and cash at the gym reception."
              />
              <QA
                question="How will I know my payment was confirmed?"
                answer="You'll receive a push notification and email once your payment has been confirmed and your membership is active."
              />
              <QA
                question="My bank transfer hasn't been confirmed — what should I do?"
                answer="If your bank transfer hasn't been confirmed within 24 hours, call us at 070 322 2211 and we'll assist you."
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">App & Account</h2>
            <div className="space-y-5">
              <QA
                question="I forgot my password. How do I reset it?"
                answer="On the login screen, tap &quot;Forgot Password&quot; and enter your email address. We will send you a link to reset your password."
              />
              <QA
                question="How do I update my profile?"
                answer="Go to Dashboard → Edit Profile to update your personal and health information."
              />
              <QA
                question="How do I turn off notifications?"
                answer="Go to Dashboard → Settings → Notifications to manage your notification preferences."
              />
              <QA
                question="How do I delete my account?"
                answer="Go to Dashboard → Settings → Delete Account. Please note that deleting your account will cancel your membership and any remaining membership period will not be refunded."
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-6">Contact Us</h2>
            <div className="space-y-2 font-body text-body-md text-on-surface-variant">
              <p><strong className="text-on-surface">Phone:</strong> 070 322 2211</p>
              <p><strong className="text-on-surface">Address:</strong> 114C Negombo Rd, Wattala 32350, Sri Lanka</p>
              <p><strong className="text-on-surface">Mon–Fri:</strong> 5AM–10PM</p>
              <p><strong className="text-on-surface">Saturday:</strong> 7AM–11AM</p>
              <p><strong className="text-on-surface">Sunday:</strong> 5AM–10PM</p>
            </div>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
