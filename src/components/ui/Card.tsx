import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  redAccent?: boolean;
}

export function Card({ children, className = '', redAccent = false }: CardProps) {
  return (
    <div className={`bg-surface-container border ${redAccent ? 'border-t-2 border-t-primary-container border-x-border-default border-b-border-default' : 'border-border-default'} p-8 transition-all hover:bg-surface-container-high ${className}`}>
      {children}
    </div>
  );
}
