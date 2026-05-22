import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-section-gap px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-gutter bg-surface-container border-t-2 border-primary-container">
      <div className="flex flex-col gap-6">
        <div className="font-display text-headline-md text-primary-container">IRONHIDE</div>
        <p className="font-label-sm text-label-sm text-on-surface-variant max-w-xs uppercase tracking-widest leading-loose">
          Built for the dedicated. Forged in discipline. Join the elite community.
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          © 2025 IRONHIDE FITNESS. 114C NEGOMBO RD, WATTALA.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest mb-2">Navigation</h4>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/facilities" className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Facilities</Link>
          <Link to="/membership" className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Plans</Link>
          <Link to="/contact" className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Contact</Link>
          <Link to="/login" className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors font-body">Member Login</Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h4 className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">Connect</h4>
        <div className="flex gap-4">
          <a href="tel:0703222211" className="w-12 h-12 bg-surface flex items-center justify-center border border-surface-container-highest hover:border-primary-container transition-colors group">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container">phone</span>
          </a>
          <a href="mailto:ironhide.fitness@gmail.com" className="w-12 h-12 bg-surface flex items-center justify-center border border-surface-container-highest hover:border-primary-container transition-colors group">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container">mail</span>
          </a>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">070 322 2211</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Mon–Fri: 5AM–10PM<br />Sat: 7AM–11AM<br />Sun: 5AM–10PM</p>
      </div>
    </footer>
  );
}
