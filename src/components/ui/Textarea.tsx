import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</label>}
      <textarea
        className={`bg-surface-container border border-border-default text-on-surface px-4 py-3 focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant resize-none ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-error text-label-sm">{error}</span>}
    </div>
  );
}
