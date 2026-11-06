import { describe, expect, it } from 'vitest';
import { currencyExponent, formatMoney, parseAmountInput, parseDecimal, toDecimalString } from './money';

describe('currencyExponent', () => {
  it('knows minor units per currency', () => {
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(currencyExponent('NOT A CODE')).toBe(2);
  });
});

describe('formatMoney / toDecimalString', () => {
  it('respects zero-decimal currencies', () => {
    expect(formatMoney({ amountMinor: 1200, currency: 'JPY' }, 'en-US')).toBe('¥1,200');
    expect(formatMoney({ amountMinor: 1549, currency: 'USD' }, 'en-US')).toBe('$15.49');
    expect(toDecimalString({ amountMinor: 1200, currency: 'JPY' })).toBe('1200');
    expect(toDecimalString({ amountMinor: 1549, currency: 'EUR' })).toBe('15.49');
  });
});

describe('parseDecimal', () => {
  it.each([
    ['12', 12],
    ['12.99', 12.99],
    ['12,99', 12.99],
    ['12.5', 12.5],
    ['1,234.50', 1234.5],
    ['1.234,50', 1234.5],
    ['1 234,50', 1234.5],
    ['1 234,50', 1234.5],
    ["1'234.50", 1234.5],
    ['1,234', 1234],
    ['1.199.000', 1199000],
  ])('%s -> %d', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', 'free', '12a34', '1..2', '12.'])('rejects %j', (input) => {
    expect(parseDecimal(input)).toBeUndefined();
  });
});

describe('parseAmountInput', () => {
  it('converts to minor units for the currency', () => {
    expect(parseAmountInput('$15.49')).toBe(1549);
    expect(parseAmountInput('15.49 USD')).toBe(1549);
    expect(parseAmountInput('1.234,5', 'EUR')).toBe(123450);
    expect(parseAmountInput('1,200', 'JPY')).toBe(1200);
    expect(parseAmountInput('free')).toBeUndefined();
  });
});
