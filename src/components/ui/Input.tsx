import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</label>}
      <input
        className={`bg-surface-container border border-border-default text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-error text-label-sm">{error}</span>}
    </div>
  );
}
