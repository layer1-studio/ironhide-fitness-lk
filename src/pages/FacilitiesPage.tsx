import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80';

const facilities = [
  { icon: 'fitness_center', num: '01', title: 'Free Weights', desc: 'Extensive range of dumbbells up to 80kg, olympic bars, and deadlift platforms with high-density rubber flooring.' },
  { icon: 'speed', num: '02', title: 'Cardio Zone', desc: 'High-performance treadmills, assault bikes, and rowing machines equipped with integrated performance tracking.' },
  { icon: 'ac_unit', num: '03', title: 'Climate Control', desc: 'Industrial-grade ventilation and cooling systems maintained at a constant 18°C for optimal training conditions.' },
  { icon: 'face', num: '04', title: 'Face Recognition', desc: 'Seamless, secure entry via biometric scanning. 24/7 access for members without the need for keys or cards.' },
  { icon: 'lock', num: '05', title: 'Smart Lockers', desc: 'Secure digital storage for your gear. Large enough for full gym bags with integrated USB charging ports.' },
  { icon: 'shower', num: '06', title: 'Recovery Suites', desc: 'Premium washrooms and high-pressure rain showers. Stocked with elite grooming products for a clean exit.' },
];

const galleryImages = [
  'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=800&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
];

export default function FacilitiesPage() {
  return (
    <PageWrapper>
      {/* Hero */}
      <section className="relative h-[600px] flex items-end overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_IMAGE} alt="Gym Floor" className="w-full h-full object-cover grayscale brightness-50" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 60%)' }} />
        </div>
        <div className="relative z-10 w-full max-w-container mx-auto px-margin-mobile md:px-margin-desktop pb-20">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 mb-4 border border-primary-container text-primary-container font-label-sm text-label-sm uppercase tracking-widest">Elite Training Grounds</span>
            <h1 className="font-display text-display-lg md:text-[120px] leading-none uppercase mb-6">
              Built for <br /><span className="text-primary-container">Performers.</span>
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-lg mb-8 font-body">No distractions. No excuses. Just raw iron and the precision equipment required to break your limits.</p>
          </div>
        </div>
      </section>

      {/* Facility Grid */}
      <section className="py-section-gap max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-gutter">
          <div>
            <h2 className="font-display text-headline-lg uppercase mb-2">THE ARSENAL</h2>
            <div className="w-24 h-1 bg-primary-container" />
          </div>
          <p className="text-body-md text-on-surface-variant md:max-w-md font-body">Precision-engineered environments designed for maximum output. Every square inch of IronHide is optimized for elite performance.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {facilities.map(f => (
            <div key={f.num} className="group bg-surface-container border-t-2 border-primary-container p-8 transition-all hover:bg-surface-container-high crimson-glow">
              <div className="flex justify-between items-start mb-12">
                <span className="material-symbols-outlined text-primary-container text-4xl">{f.icon}</span>
                <span className="text-stroke font-display text-4xl opacity-50">{f.num}</span>
              </div>
              <h3 className="font-display text-headline-md uppercase mb-4">{f.title}</h3>
              <p className="text-body-md text-on-surface-variant font-body">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="pb-section-gap">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop mb-12">
          <h2 className="font-display text-headline-lg uppercase">THE INTERIOR</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 max-w-[1920px] mx-auto">
          <div className="grid gap-4">
            {galleryImages.slice(0, 2).map((src, i) => (
              <div key={i} className="relative overflow-hidden group">
                <img src={src} alt="Gym interior" className="h-auto max-w-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110" />
              </div>
            ))}
          </div>
          <div className="grid gap-4">
            <div className="relative overflow-hidden group h-full">
              <img src={galleryImages[2]} alt="Gym interior" className="h-full max-w-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110" />
            </div>
          </div>
          <div className="grid gap-4">
            {galleryImages.slice(3).map((src, i) => (
              <div key={i} className="relative overflow-hidden group">
                <img src={src} alt="Gym interior" className="h-auto max-w-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-container py-24 text-center">
        <div className="max-w-container mx-auto px-margin-mobile">
          <h2 className="font-display text-display-lg md:text-[96px] text-on-primary-container uppercase mb-8">Ready to evolve?</h2>
          <Link to="/signup" className="inline-block bg-surface text-on-surface px-12 py-4 font-display text-headline-md hover:scale-105 transition-transform active:scale-95">
            JOIN NOW
          </Link>
        </div>
      </section>
    </PageWrapper>
  );
}
