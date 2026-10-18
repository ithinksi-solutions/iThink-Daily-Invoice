import { format, parseISO } from 'date-fns';

/**
 * Formats a number to Indian Rupee currency format
 * Example: 125000 -> "₹ 1,25,000.00"
 */
export function formatINR(amount: number | string | null | undefined, showDecimals: boolean = true): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return '₹ 0.00';

  const parts = num.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Indian number system regex: last 3 digits, then groups of 2
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    integerPart = lastThree;
  }

  return `₹ ${integerPart}${decimalPart}`;
}

/**
 * Formats date strictly to dd-mon-yyyy (e.g. 07-Oct-2026)
 */
export function formatAppDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? (date.length === 10 ? new Date(`${date}T00:00:00`) : parseISO(date)) : date;
    return format(d, 'dd-MMM-yyyy');
  } catch {
    return String(date);
  }
}

/**
 * Formats timestamp to 12-hour time (e.g. 10:45 AM)
 */
export function formatAppTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'hh:mm a');
  } catch {
    return '-';
  }
}

/**
 * Returns current Indian Standard Time (IST) date in YYYY-MM-DD
 */
export function getCurrentISTDateString(): string {
  const now = new Date();
  // IST is UTC + 5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 3600000;
  const istTime = new Date(utc + istOffset);
  return istTime.toISOString().split('T')[0];
}

/**
 * Formats ISO date string to YYYY-MM-DD
 */
export function toISODateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
