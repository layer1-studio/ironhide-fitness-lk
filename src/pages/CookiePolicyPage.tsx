import { PageWrapper } from '../components/layout/PageWrapper';

export default function CookiePolicyPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <h1 className="font-display text-headline-lg text-primary-container uppercase mb-2">Cookie Policy</h1>
        <p className="font-body text-body-md text-on-surface-variant mb-10">IronHide Fitness | 114C Negombo Rd, Wattala 32350, Sri Lanka</p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">What Are Cookies</h2>
            <p className="font-body text-body-md text-on-surface-variant">Cookies are small text files stored on your device by your browser when you visit a website. They help websites remember your preferences and keep you logged in between visits.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">What We Use</h2>
            <div className="space-y-4 font-body text-body-md text-on-surface-variant">
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Authentication Cookies</p>
                <p>These cookies keep you logged in to your IronHide account via Firebase Auth. Without them, you would need to sign in every time you visit. These are strictly necessary for the app to function.</p>
              </div>
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Preference Cookies</p>
                <p>These store your app settings and preferences so they persist between sessions.</p>
              </div>
              <div>
                <p className="text-on-surface font-display uppercase mb-1">Analytics</p>
                <p>We do not currently use any third-party analytics cookies.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">Your Control</h2>
            <p className="font-body text-body-md text-on-surface-variant">You can clear cookies at any time through your browser or device settings. Please note that clearing cookies will end your current authentication session and you will need to sign in again.</p>
          </section>

          <section>
            <h2 className="font-display text-primary-container uppercase text-headline-md mb-3">Contact</h2>
            <p className="font-body text-body-md text-on-surface-variant">If you have questions about our use of cookies, contact us at 070 322 2211 or visit 114C Negombo Rd, Wattala 32350, Sri Lanka.</p>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
