import type { BillingCycle, Money } from '../subscription';

/**
 * Heuristic, AI-free detection of subscription checkout pages. This runs on every
 * matched page load, so it must stay cheap and synchronous. An optional AI pass can
 * refine uncertain results later; the heuristics must stand on their own.
 */

export interface PageSnapshot {
  url: string;
  title: string;
  /** Visible page text, already truncated by the caller. */
  text: string;
  /** True when the page has a card-number style input (autocomplete="cc-number" etc.). */
  hasCardField: boolean;
}

export interface RecurringPrice {
  price: Money;
  cycle: BillingCycle;
}

export interface CheckoutDetection {
  isLikelyCheckout: boolean;
  /** 0..1 */
  confidence: number;
  reasons: string[];
  recurring?: RecurringPrice;
  trial?: { days?: number };
}

const CHECKOUT_PATH =
  /\/(checkout|subscribe|signup|sign-up|payment|billing|plans?|join|upgrade|membership|purchase)\b/i;

const SUBSCRIPTION_VOCAB = [
  /\bsubscri(be|ption)\b/i,
  /\bmembership\b/i,
  /\bauto[- ]?renew/i,
  /\brenews?\b/i,
  /\brecurring\b/i,
  /\bcancel any ?time\b/i,
  /\bbilled (monthly|annually|yearly|weekly)\b/i,
];

const START_CTA =
  /\b(start (my |your )?(membership|subscription|free trial|trial|plan)|subscribe now|join now|upgrade now|confirm (and|&) pay|start watching|try (it )?free)\b/i;

const CURRENCY_SYMBOLS: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };

const PRICE =
  /(?<cur>US\$|CA\$|A\$|USD|EUR|GBP|CAD|AUD|[$€£¥₹])\s?(?<amt>\d{1,5}(?:[.,]\d{1,2})?)\s*(?:\/\s*|per\s+|a\s+|each\s+|every\s+)(?<per>month|mo|year|yr|annum|week|wk|quarter)\b/i;

const TRIAL_WITH_LENGTH = /\b(?<n>\d{1,3})[- ](?<unit>day|week|month)s?\s+(?:free\s+)?trial\b/i;
const FREE_FOR_LENGTH = /\bfree\s+for\s+(?<n>\d{1,3})\s+(?<unit>day|week|month)s?\b/i;
const TRIAL_ANY = /\bfree trial\b|\btrial ends\b/i;

function currencyCode(raw: string): string {
  const prefixed: Record<string, string> = { US$: 'USD', CA$: 'CAD', A$: 'AUD' };
  return prefixed[raw] ?? CURRENCY_SYMBOLS[raw] ?? raw.toUpperCase();
}

function cycleFrom(per: string): BillingCycle {
  const p = per.toLowerCase();
  if (p.startsWith('w')) return 'weekly';
  if (p.startsWith('q')) return 'quarterly';
  if (p.startsWith('y') || p === 'annum') return 'yearly';
  return 'monthly';
}

export function parseRecurringPrice(text: string): RecurringPrice | undefined {
  const m = PRICE.exec(text);
  if (!m?.groups) return undefined;
  const { cur, amt, per } = m.groups as { cur: string; amt: string; per: string };
  const amount = Number.parseFloat(amt.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return {
    price: { amountMinor: Math.round(amount * 100), currency: currencyCode(cur) },
    cycle: cycleFrom(per),
  };
}

export function parseTrial(text: string): { days?: number } | undefined {
  const m = TRIAL_WITH_LENGTH.exec(text) ?? FREE_FOR_LENGTH.exec(text);
  if (m?.groups) {
    const n = Number.parseInt(m.groups.n ?? '', 10);
    const perUnit = { day: 1, week: 7, month: 30 }[(m.groups.unit ?? 'day').toLowerCase() as 'day' | 'week' | 'month'];
    return { days: n * perUnit };
  }
  return TRIAL_ANY.test(text) ? {} : undefined;
}

export const CHECKOUT_THRESHOLD = 0.6;

export function detectCheckout(page: PageSnapshot): CheckoutDetection {
  const reasons: string[] = [];
  let score = 0;

  if (page.hasCardField) {
    score += 0.35;
    reasons.push('card number field');
  }

  let path = '';
  try {
    path = new URL(page.url).pathname;
  } catch {
    // Ignore malformed URLs; the text signals still apply.
  }
  if (CHECKOUT_PATH.test(path)) {
    score += 0.15;
    reasons.push('checkout-like URL');
  }

  const haystack = `${page.title}\n${page.text}`;

  const recurring = parseRecurringPrice(haystack);
  if (recurring) {
    score += 0.3;
    reasons.push('recurring price');
  }

  const trial = parseTrial(haystack);
  if (trial) {
    score += 0.15;
    reasons.push('free trial');
  }

  const vocabHits = SUBSCRIPTION_VOCAB.filter((re) => re.test(haystack)).length;
  if (vocabHits > 0) {
    score += Math.min(vocabHits * 0.05, 0.2);
    reasons.push(`${vocabHits} subscription term(s)`);
  }

  const hasStartCta = START_CTA.test(haystack);
  if (hasStartCta) {
    score += 0.1;
    reasons.push('start/subscribe button text');
  }

  const confidence = Math.min(score, 1);
  // Pricing pages are full of recurring prices; require a payment field or a commit-style CTA.
  const isLikelyCheckout = confidence >= CHECKOUT_THRESHOLD && (page.hasCardField || hasStartCta);

  return {
    isLikelyCheckout,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    ...(recurring && { recurring }),
    ...(trial && { trial }),
  };
}
