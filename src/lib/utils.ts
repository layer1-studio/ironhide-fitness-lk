export function calculateBMI(height: number, weight: number): number {
  if (!height || !weight) return 0;
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function formatDate(date: Date | { toDate(): Date } | undefined | null): string {
  if (!date) return '—';
  const d = typeof (date as { toDate?: () => Date }).toDate === 'function'
    ? (date as { toDate(): Date }).toDate()
    : date as Date;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}
