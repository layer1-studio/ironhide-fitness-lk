export function calculateBMI(height: number, weight: number): number {
  if (!height || !weight) return 0;
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}
