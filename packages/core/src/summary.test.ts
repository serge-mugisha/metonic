import { describe, expect, it } from 'vitest';
import type { Subscription } from './subscription';
import { savedPerMonth, spendByCategory, upcomingCharges, yearlyTotals } from './summary';

let n = 0;
function sub(overrides: Partial<Subscription>): Subscription {
  n++;
  return {
    id: `s${n}`,
    name: `Sub ${n}`,
    price: { amountMinor: 1000, currency: 'USD' },
    cycle: 'monthly',
    status: 'active',
    source: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('yearlyTotals', () => {
  it('sums active subscriptions per currency from the exact price', () => {
    expect(
      yearlyTotals([
        sub({ price: { amountMinor: 999, currency: 'USD' } }),
        sub({ cycle: 'yearly', price: { amountMinor: 8499, currency: 'USD' } }),
        sub({ cycle: 'weekly', price: { amountMinor: 300, currency: 'EUR' } }),
        sub({ status: 'trial' }),
        sub({ status: 'cancelled' }),
      ]),
    ).toEqual({ USD: 999 * 12 + 8499, EUR: 300 * 52 });
  });
});

describe('spendByCategory', () => {
  it('groups monthly spend per currency, largest first', () => {
    const subs = [
      sub({ name: 'A', category: 'music', price: { amountMinor: 1199, currency: 'USD' } }),
      sub({ name: 'B', price: { amountMinor: 1799, currency: 'USD' } }),
      sub({ name: 'C', price: { amountMinor: 799, currency: 'USD' } }),
      sub({ name: 'D', category: 'music', status: 'paused' }),
      sub({ name: 'E', category: 'news', price: { amountMinor: 500, currency: 'EUR' } }),
    ];
    const result = spendByCategory(subs, (s) => s.category ?? 'streaming');
    expect(result).toEqual({
      USD: [
        { category: 'streaming', monthlyMinor: 2598, count: 2 },
        { category: 'music', monthlyMinor: 1199, count: 1 },
      ],
      EUR: [{ category: 'news', monthlyMinor: 500, count: 1 }],
    });
  });
});

describe('upcomingCharges', () => {
  it('lists every charge in the window, trials first on the same day', () => {
    const weekly = sub({ name: 'weekly', cycle: 'weekly', billingAnchorOn: '2026-11-03' });
    const monthly = sub({ name: 'monthly', billingAnchorOn: '2026-10-20' });
    const trial = sub({ name: 'trial', status: 'trial', trialEndsOn: '2026-11-20' });
    const later = sub({ name: 'later', cycle: 'yearly', billingAnchorOn: '2027-03-01' });
    const paused = sub({ name: 'paused', status: 'paused', billingAnchorOn: '2026-11-08' });
    const charges = upcomingCharges([weekly, monthly, trial, later, paused], '2026-11-06', 30);
    expect(charges.map((c) => `${c.on} ${c.sub.name} ${c.kind}`)).toEqual([
      '2026-11-10 weekly renewal',
      '2026-11-17 weekly renewal',
      '2026-11-20 trial trial-end',
      '2026-11-20 monthly renewal',
      '2026-11-24 weekly renewal',
      '2026-12-01 weekly renewal',
    ]);
  });

  it('skips trials that already ended', () => {
    expect(upcomingCharges([sub({ status: 'trial', trialEndsOn: '2026-11-01' })], '2026-11-06')).toEqual([]);
  });
});

describe('savedPerMonth', () => {
  it('counts cancelled subscriptions at their monthly price', () => {
    expect(
      savedPerMonth([
        sub({ status: 'cancelled', cycle: 'yearly', price: { amountMinor: 12000, currency: 'USD' } }),
        sub({ status: 'cancelled', price: { amountMinor: 999, currency: 'USD' } }),
        sub({}),
      ]),
    ).toEqual({ USD: 1999 });
  });
});
