const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null, currency = 'NGN'): string {
  if (value === null) return 'Price unavailable';
  return (currency === 'NGN' ? currencyFormatter : new Intl.NumberFormat('en', {style:'currency',currency,maximumFractionDigits:0})).format(Math.round(value));
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export function formatCamera(mp: number, type?: string): string {
  const suffix = type ? ` ${type}` : '';
  const formatted = `${formatNumber(mp, { maximumFractionDigits: 1 })} MP${suffix}`;
  return formatted.replace(/\s+/g, ' ').trim();
}
