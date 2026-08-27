export function formatCurrency(n: number, currency: 'USD' | 'XCG' = 'USD'): string {
  if (currency === 'XCG') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + ' XCG';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCurrencyPrecise(n: number, currency: 'USD' | 'XCG' = 'USD'): string {
  if (currency === 'XCG') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + ' XCG';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ci = new Date(checkIn + 'T00:00:00');
  const co = new Date(checkOut + 'T00:00:00');
  const diff = co.getTime() - ci.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function calcPricing(
  baseRate: number,
  cleaningFee: number,
  taxRate: number,
  nights: number,
) {
  const baseTotal = baseRate * nights;
  const taxTotal = baseTotal * taxRate;
  const grandTotal = baseTotal + cleaningFee + taxTotal;
  return { baseTotal, cleaningFee, taxTotal, grandTotal };
}

// XCG is pegged to USD at ~0.56
const XCG_TO_USD = 0.56;

export function convertCurrency(amount: number, from: 'USD' | 'XCG', to: 'USD' | 'XCG'): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'XCG') return amount / XCG_TO_USD;
  return amount * XCG_TO_USD;
}

// CSV export helper
export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Brand color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 16, g: 185, b: 129 };
}

export function brandColorClass(hex: string): string {
  // Convert hex to inline style — returns a CSS color string
  return hex;
}
