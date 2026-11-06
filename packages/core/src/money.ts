/** Amounts are integers in the currency's minor unit (cents for USD, yen for JPY). */
export interface Money {
  /** Amount in minor units to avoid floating point drift. JPY has no minor unit, so ¥1,200 is 1200. */
  amountMinor: number;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
}

const exponentCache = new Map<string, number>();

/** Number of decimal digits in the currency's minor unit: 2 for USD, 0 for JPY, 3 for KWD. */
export function currencyExponent(currency: string): number {
  let exponent = exponentCache.get(currency);
  if (exponent === undefined) {
    try {
      exponent =
        new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      exponent = 2;
    }
    exponentCache.set(currency, exponent);
  }
  return exponent;
}

export function formatMoney(money: Money, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency }).format(
    money.amountMinor / 10 ** currencyExponent(money.currency),
  );
}

/** Minor units as a plain decimal string for form inputs, e.g. 1549 USD -> "15.49", 1200 JPY -> "1200". */
export function toDecimalString(money: Money): string {
  const exponent = currencyExponent(money.currency);
  return (money.amountMinor / 10 ** exponent).toFixed(exponent);
}

/**
 * Read a number written with any common grouping and decimal convention:
 * "12.99", "12,99", "1,234.50", "1.234,50", "1 234,50", "1'234.50".
 * The last separator is the decimal point only if 1-2 digits follow it, so
 * "1,234" and "1.234" are both one thousand two hundred thirty-four.
 */
export function parseDecimal(text: string): number | undefined {
  const cleaned = text.replace(/[\s  '’]/g, '');
  if (!/^\d[\d.,]*$/.test(cleaned) || /[.,]{2}/.test(cleaned) || /[.,]$/.test(cleaned)) return undefined;
  const last = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const decimals = last === -1 ? '' : cleaned.slice(last + 1);
  const isDecimal = last !== -1 && decimals.length <= 2;
  const whole = (isDecimal ? cleaned.slice(0, last) : cleaned).replace(/[.,]/g, '');
  const value = Number(`${whole}${isDecimal ? `.${decimals}` : ''}`);
  return Number.isFinite(value) ? value : undefined;
}

export function toMinorUnits(value: number, currency: string): number {
  return Math.round(value * 10 ** currencyExponent(currency));
}

/**
 * Parse a price typed by a person into minor units. Tolerates a currency symbol or
 * code around the number ("$15.49", "15.49 USD"). Returns undefined if unreadable.
 */
export function parseAmountInput(text: string, currency = 'USD'): number | undefined {
  const value = parseDecimal(text.trim().replace(/^[^\d]+|[^\d]+$/g, ''));
  if (value === undefined) return undefined;
  const minor = toMinorUnits(value, currency);
  return Number.isSafeInteger(minor) ? minor : undefined;
}
