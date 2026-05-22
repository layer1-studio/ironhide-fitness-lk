import React from 'react';

interface BadgeProps {
  status: 'active' | 'expired' | 'pending_verification' | 'pending_cash' | 'confirmed' | 'rejected';
  children?: React.ReactNode;
}

const statusConfig = {
  active: { color: 'text-green-400 border-green-400', label: 'ACTIVE' },
  confirmed: { color: 'text-green-400 border-green-400', label: 'CONFIRMED' },
  expired: { color: 'text-red-400 border-red-400', label: 'EXPIRED' },
  rejected: { color: 'text-red-400 border-red-400', label: 'REJECTED' },
  pending_verification: { color: 'text-yellow-400 border-yellow-400', label: 'PENDING' },
  pending_cash: { color: 'text-yellow-400 border-yellow-400', label: 'PENDING CASH' },
};

export function Badge({ status, children }: BadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`font-label-sm text-label-sm border px-3 py-1 uppercase tracking-widest ${config.color}`}>
      {children ?? config.label}
    </span>
  );
}
