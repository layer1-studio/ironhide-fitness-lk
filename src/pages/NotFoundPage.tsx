import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 text-center gap-6">
      <div className="font-display text-[120px] leading-none text-surface-container-highest select-none">404</div>
      <div className="space-y-2">
        <h1 className="font-display text-headline-lg uppercase">Page Not Found</h1>
        <p className="font-body text-body-lg text-on-surface-variant max-w-sm">
          This page doesn't exist or has been moved.
        </p>
      </div>
      <Link
        to="/"
        className="bg-primary-container text-on-primary-container px-8 py-3 font-display text-headline-md uppercase hover:scale-105 transition-all active:scale-95"
      >
        BACK TO HOME
      </Link>
    </div>
  );
}
