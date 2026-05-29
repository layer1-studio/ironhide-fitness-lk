import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Navbar />
      {!online && !dismissed && (
        <div className="bg-yellow-600 text-yellow-50 px-4 py-2 flex items-center justify-between gap-4 text-body-md font-body">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M5 10.5s2.5-1.5 7-1.5 7 1.5 7 1.5"/><path d="M8.5 14.5s1.5-1 3.5-1 3.5 1 3.5 1"/><line x1="12" y1="19" x2="12.01" y2="19"/></svg>
            You're offline. Some features may be unavailable.
          </div>
          <button onClick={() => setDismissed(true)} className="hover:opacity-75 shrink-0" aria-label="Dismiss">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
