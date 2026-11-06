import { describe, expect, it } from 'vitest';
import {
  addCycle,
  daysUntil,
  monthlyCostMinor,
  monthlyTotals,
  nextChargeOn,
  nextRenewalFrom,
  parseAmountInput,
  type Subscription,
} from './subscription';

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'x',
    name: 'X',
    price: { amountMinor: 1200, currency: 'USD' },
    cycle: 'monthly',
    status: 'active',
    source: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('monthlyCostMinor', () => {
  it('normalizes cycles to a monthly amount', () => {
    expect(monthlyCostMinor(sub({ cycle: 'monthly' }))).toBe(1200);
    expect(monthlyCostMinor(sub({ cycle: 'yearly', price: { amountMinor: 12000, currency: 'USD' } }))).toBe(1000);
    expect(monthlyCostMinor(sub({ cycle: 'weekly', price: { amountMinor: 300, currency: 'USD' } }))).toBe(1300);
  });

  it('treats non-active subscriptions as free right now', () => {
    expect(monthlyCostMinor(sub({ status: 'trial' }))).toBe(0);
    expect(monthlyCostMinor(sub({ status: 'paused' }))).toBe(0);
    expect(monthlyCostMinor(sub({ status: 'cancelled' }))).toBe(0);
  });
});

describe('monthlyTotals', () => {
  it('groups by currency without converting', () => {
    const totals = monthlyTotals([
      sub({ id: 'a' }),
      sub({ id: 'b', price: { amountMinor: 999, currency: 'EUR' } }),
      sub({ id: 'c', price: { amountMinor: 800, currency: 'USD' } }),
    ]);
    expect(totals).toEqual({ USD: 2000, EUR: 999 });
  });
});

describe('addCycle', () => {
  it('adds cycles and clamps month ends', () => {
    expect(addCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addCycle('2028-01-31', 'monthly')).toBe('2028-02-29');
    expect(addCycle('2026-11-30', 'quarterly')).toBe('2027-02-28');
    expect(addCycle('2026-12-28', 'weekly')).toBe('2027-01-04');
    expect(addCycle('2028-02-29', 'yearly')).toBe('2029-02-28');
  });
});

describe('nextRenewalFrom', () => {
  it('rolls past dates forward and keeps future ones', () => {
    expect(nextRenewalFrom('2026-08-15', 'monthly', '2026-11-03')).toBe('2026-11-15');
    expect(nextRenewalFrom('2026-11-03', 'monthly', '2026-11-03')).toBe('2026-11-03');
    expect(nextRenewalFrom('2027-01-01', 'yearly', '2026-11-03')).toBe('2027-01-01');
  });

  it('does not drift on month ends', () => {
    expect(nextRenewalFrom('2026-01-31', 'monthly', '2026-03-15')).toBe('2026-03-31');
  });
});

describe('nextChargeOn', () => {
  it('uses trial end for trials and the rolled anchor for active subs', () => {
    expect(nextChargeOn(sub({ status: 'trial', trialEndsOn: '2026-11-20' }), '2026-11-03')).toBe('2026-11-20');
    expect(nextChargeOn(sub({ billingAnchorOn: '2026-09-10' }), '2026-11-03')).toBe('2026-11-10');
    expect(nextChargeOn(sub({ status: 'cancelled', billingAnchorOn: '2026-09-10' }), '2026-11-03')).toBeUndefined();
  });
});

describe('daysUntil', () => {
  it('counts whole calendar days', () => {
    const from = new Date(2026, 10, 3, 18, 30);
    expect(daysUntil('2026-11-03', from)).toBe(0);
    expect(daysUntil('2026-11-10', from)).toBe(7);
    expect(daysUntil('2026-11-01', from)).toBe(-2);
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['12', 1200],
    ['12.99', 1299],
    ['12,99', 1299],
    ['12.5', 1250],
    ['1,234.50', 123450],
    ['1.234,50', 123450],
    ['1 234,50', 123450],
    ['1,234', 123400],
    ['$15.49', 1549],
    ['15.49 USD', 1549],
  ])('%s -> %i', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it('rejects text that is not a number', () => {
    expect(parseAmountInput('')).toBeUndefined();
    expect(parseAmountInput('free')).toBeUndefined();
    expect(parseAmountInput('12a34')).toBeUndefined();
  });
});
