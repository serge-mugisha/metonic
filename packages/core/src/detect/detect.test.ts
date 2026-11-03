import { describe, expect, it } from 'vitest';
import { detectCheckout, parseRecurringPrice, parseTrial } from './detect';

describe('parseRecurringPrice', () => {
  it.each([
    ['$15.49/month', 1549, 'USD', 'monthly'],
    ['Only £10.99 per month', 1099, 'GBP', 'monthly'],
    ['€99,99 / year', 9999, 'EUR', 'yearly'],
    ['US$4 a week', 400, 'USD', 'weekly'],
    ['CAD 30 every quarter', 3000, 'CAD', 'quarterly'],
    ['$119.88/yr billed annually', 11988, 'USD', 'yearly'],
  ])('parses %s', (text, amountMinor, currency, cycle) => {
    expect(parseRecurringPrice(text)).toEqual({ price: { amountMinor, currency }, cycle });
  });

  it('ignores one-off prices', () => {
    expect(parseRecurringPrice('Total: $49.99')).toBeUndefined();
  });
});

describe('parseTrial', () => {
  it('reads trial lengths', () => {
    expect(parseTrial('Start your 30-day free trial')).toEqual({ days: 30 });
    expect(parseTrial('1 month free trial, then $9.99/mo')).toEqual({ days: 30 });
    expect(parseTrial('Free for 2 weeks')).toEqual({ days: 14 });
  });

  it('flags trials without a length', () => {
    expect(parseTrial('Your free trial includes everything')).toEqual({});
  });

  it('returns undefined without a trial', () => {
    expect(parseTrial('Pay monthly')).toBeUndefined();
  });
});

describe('detectCheckout', () => {
  it('detects a typical streaming checkout', () => {
    const d = detectCheckout({
      url: 'https://www.example-tv.com/signup/payment',
      title: 'Set up your payment',
      text: 'Standard plan $15.49/month. Your membership renews automatically. Cancel anytime. Start Membership',
      hasCardField: true,
    });
    expect(d.isLikelyCheckout).toBe(true);
    expect(d.recurring).toEqual({ price: { amountMinor: 1549, currency: 'USD' }, cycle: 'monthly' });
    expect(d.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('detects a trial signup without a card field when there is a commit CTA', () => {
    const d = detectCheckout({
      url: 'https://app.example.com/upgrade',
      title: 'Upgrade',
      text: 'Pro $12/month after your 14-day free trial. Subscription renews monthly. Start free trial',
      hasCardField: false,
    });
    expect(d.isLikelyCheckout).toBe(true);
    expect(d.trial).toEqual({ days: 14 });
  });

  it('does not flag a plain pricing page', () => {
    const d = detectCheckout({
      url: 'https://example.com/pricing',
      title: 'Pricing',
      text: 'Basic $5/month, Pro $12/month, Team $30/month. Billed monthly. Compare plans.',
      hasCardField: false,
    });
    expect(d.isLikelyCheckout).toBe(false);
  });

  it('does not flag a one-off store checkout', () => {
    const d = detectCheckout({
      url: 'https://shop.example.com/checkout',
      title: 'Checkout',
      text: 'Order summary: Headphones $79.99. Total $85.43. Place order',
      hasCardField: true,
    });
    expect(d.isLikelyCheckout).toBe(false);
  });
});
