import { describe, expect, it } from 'vitest';
import { currencyCode, detectCheckout, parseRecurringPrice, parseTrial } from './detect';

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

  it.each([
    // Suffix currency, comma decimals, non-English periods
    ['9,99 €/Monat', 999, 'EUR', 'monthly'],
    ['Nur 13,99 € pro Monat', 1399, 'EUR', 'monthly'],
    ['11,99 € par mois', 1199, 'EUR', 'monthly'],
    ['119,99 €/an', 11999, 'EUR', 'yearly'],
    ['12,99 € al mes', 1299, 'EUR', 'monthly'],
    ['R$ 55,90/mês', 5590, 'BRL', 'monthly'],
    ['€ 9,99 al mese', 999, 'EUR', 'monthly'],
    ['€ 10,99 per maand', 1099, 'EUR', 'monthly'],
    ['99,00 kr/mån', 9900, 'SEK', 'monthly'],
    ['119 kr i månaden', 11900, 'SEK', 'monthly'],
    ['23,99 zł/mies.', 2399, 'PLN', 'monthly'],
    ['CHF 12.90 pro Monat', 1290, 'CHF', 'monthly'],
    // Thousands separators
    ['$1,199.00/year', 119900, 'USD', 'yearly'],
    ['1.199,00 € jährlich', 119900, 'EUR', 'yearly'],
    ['1 199,00 kr/år', 119900, 'SEK', 'yearly'],
    // Adverbs and UK abbreviations
    ['€9.99 monthly', 999, 'EUR', 'monthly'],
    ['£60 p.a.', 6000, 'GBP', 'yearly'],
    ['£5.99 p.m.', 599, 'GBP', 'monthly'],
    // Zero-decimal currency
    ['¥1,490/月', 1490, 'JPY', 'monthly'],
    ['₩13,900/month', 13900, 'KRW', 'monthly'],
    ['1,490円/月', 1490, 'JPY', 'monthly'],
  ])('parses %s', (text, amountMinor, currency, cycle) => {
    expect(parseRecurringPrice(text)).toEqual({ price: { amountMinor, currency }, cycle });
  });

  it('uses page language and TLD to resolve ambiguous symbols', () => {
    expect(parseRecurringPrice('$16.49/month', { url: 'https://www.netflix.com/ca/' })?.price.currency).toBe('USD');
    expect(parseRecurringPrice('$16.49/month', { url: 'https://www.example.ca/signup' })?.price.currency).toBe('CAD');
    expect(parseRecurringPrice('$16.49/month', { lang: 'en-AU' })?.price.currency).toBe('AUD');
    expect(parseRecurringPrice('$16.49/month', { lang: 'fr-CA', url: 'https://x.com' })?.price.currency).toBe('CAD');
    expect(parseRecurringPrice('99 kr/mnd', { lang: 'nb' })?.price.currency).toBe('NOK');
    expect(parseRecurringPrice('99 kr. om måneden', { url: 'https://shop.dk/' })?.price.currency).toBe('DKK');
    expect(currencyCode('¥', { lang: 'zh-CN' })).toBe('CNY');
  });

  it('ignores one-off prices', () => {
    expect(parseRecurringPrice('Total: $49.99')).toBeUndefined();
    expect(parseRecurringPrice('Gesamt: 49,99 €')).toBeUndefined();
  });

  it('does not read words that merely start with a period word', () => {
    expect(parseRecurringPrice('$5 a monster truck')).toBeUndefined();
    expect(parseRecurringPrice('€5 per annuity')).toBeUndefined();
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
