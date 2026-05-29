import React from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-6 px-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h1 className="font-display text-headline-lg uppercase">Something went wrong</h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-md">An unexpected error occurred. Please refresh the page.</p>
          <button onClick={() => window.location.reload()} className="bg-primary-container text-on-primary-container px-8 py-3 font-display text-headline-md uppercase hover:scale-105 transition-all">
            REFRESH PAGE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
