import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

const plans = [
  {
    tier: 'Foundation',
    name: 'MONTHLY',
    price: '5,000',
    period: '/MO',
    features: [
      { text: '24/7 Facility Access', available: true },
      { text: 'Premium AC Locker Rooms', available: true },
      { text: 'Standard Equipment Access', available: true },
      { text: 'Expert Personal Training', available: false },
    ],
    popular: false,
  },
  {
    tier: 'Warrior',
    name: 'QUARTERLY',
    price: '13,500',
    period: '/3 MO',
    features: [
      { text: 'All Foundation Benefits', available: true },
      { text: '2 Guest Passes per Month', available: true },
      { text: '1 Nutrition Consultation', available: true },
      { text: 'Expert Trainer Access', available: true },
    ],
    popular: true,
  },
  {
    tier: 'Elite',
    name: 'ANNUAL',
    price: '48,000',
    period: '/YR',
    features: [
      { text: 'Unlimited All-Access', available: true },
      { text: 'Monthly Trainer PT Sessions', available: true },
      { text: 'Exclusive IronHide Apparel Kit', available: true },
      { text: 'VIP Recovery Lounge', available: true },
    ],
    popular: false,
  },
];

export default function MembershipPage() {
  return (
    <PageWrapper>
      <main className="min-h-screen">
        {/* Hero */}
        <header className="relative pt-24 pb-16 px-margin-mobile md:px-margin-desktop text-center max-w-container mx-auto">
          <h1 className="font-display text-[64px] md:text-display-lg uppercase tracking-tight" style={{ textShadow: '0 0 20px rgba(204, 0, 0, 0.4)' }}>
            ELITE PERFORMANCE PLANS
          </h1>
          <p className="text-body-lg text-on-secondary-container mt-4 max-w-2xl mx-auto font-body">
            Forge your legacy with precision-engineered training access. Choose the tier that matches your intensity.
          </p>
        </header>

        {/* Plans Grid */}
        <section className="px-margin-mobile md:px-margin-desktop pb-section-gap max-w-container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`bg-[#111111] p-8 flex flex-col items-center transition-all hover:-translate-y-2 relative ${plan.popular ? 'border-2 border-primary-container scale-105 z-10 crimson-glow' : 'border border-[#333333] border-t-2 border-t-primary-container'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 bg-primary-container text-white font-label-sm text-label-sm px-4 py-1 uppercase font-extrabold tracking-widest">
                    MOST POPULAR
                  </div>
                )}
                <span className="bg-[#000000] border border-primary-container text-primary-container font-label-sm text-label-sm px-4 py-1 mb-6 uppercase tracking-widest">
                  {plan.tier}
                </span>
                <h2 className="font-display text-headline-lg mb-2">{plan.name}</h2>
                <div className="flex items-baseline mb-8">
                  <span className="font-display text-headline-md text-primary-container">LKR</span>
                  <span className="font-display text-6xl ml-1">{plan.price}</span>
                  <span className="font-label-sm text-label-sm text-on-secondary-container ml-2">{plan.period}</span>
                </div>
                <ul className="w-full space-y-4 mb-10 text-on-secondary-container">
                  {plan.features.map(f => (
                    <li key={f.text} className={`flex items-center gap-3 font-body text-body-md ${f.available ? '' : 'opacity-30'}`}>
                      <span className="material-symbols-outlined text-primary-container" style={f.available ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {f.available ? 'check_circle' : 'block'}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="w-full bg-primary-container text-white py-4 font-display text-headline-md uppercase hover:scale-105 active:scale-95 transition-all text-center block">
                  JOIN NOW
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Methods */}
        <section className="bg-surface-container py-16 px-margin-mobile border-t-2 border-primary-container">
          <div className="max-w-container mx-auto text-center">
            <h3 className="font-display text-headline-md mb-8">SECURE PAYMENT METHODS</h3>
            <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-60">
              {[
                { icon: 'credit_card', label: 'Credit Card' },
                { icon: 'account_balance', label: 'Bank Transfer' },
                { icon: 'payments', label: 'Cash Payment' },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl">{m.icon}</span>
                  <p className="font-label-sm text-label-sm uppercase">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 font-label-sm text-label-sm text-on-surface-variant max-w-lg mx-auto">
              All transactions are encrypted and processed securely. Membership begins upon payment confirmation.
            </p>
          </div>
        </section>
      </main>
    </PageWrapper>
  );
}
