import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'font-display uppercase tracking-wider transition-all active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-background',
    ghost: 'border border-surface-container-highest text-on-surface hover:bg-surface-container-high',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-body-md',
    lg: 'px-10 py-4 text-headline-md',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="material-symbols-outlined animate-spin text-sm">refresh</span>}
      {children}
    </button>
  );
}
