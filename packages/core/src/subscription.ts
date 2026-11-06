import { formatMoney, type Money } from './money';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionStatus = 'trial' | 'active' | 'paused' | 'cancelled';

/** Where we learned about a subscription. */
export type SubscriptionSource = 'detected' | 'manual' | 'imported';

export interface Subscription {
  id: string;
  /** Recipe id when the service is known to Metonic, e.g. "netflix". */
  serviceId?: string;
  name: string;
  price: Money;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  /** ISO 8601 dates (YYYY-MM-DD). */
  startedOn?: string;
  /** Any date the subscription renewed or will renew on. Renewals repeat from it; see `nextRenewal`. */
  billingAnchorOn?: string;
  trialEndsOn?: string;
  pausedUntil?: string;
  source: SubscriptionSource;
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const CYCLES_PER_YEAR: Record<BillingCycle, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** Normalized monthly cost in minor units. Paused, cancelled and trial subscriptions cost nothing right now. */
export function monthlyCostMinor(sub: Pick<Subscription, 'price' | 'cycle' | 'status'>): number {
  if (sub.status !== 'active') return 0;
  return Math.round((sub.price.amountMinor * CYCLES_PER_YEAR[sub.cycle]) / 12);
}

/** Monthly totals grouped by currency. We never convert currencies implicitly. */
export function monthlyTotals(subs: Subscription[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const sub of subs) {
    const cost = monthlyCostMinor(sub);
    if (cost === 0) continue;
    totals[sub.price.currency] = (totals[sub.price.currency] ?? 0) + cost;
  }
  return totals;
}

export const CYCLE_UNIT: Record<BillingCycle, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

/** e.g. "$15.49/month" */
export function formatRecurring(money: Money, cycle: BillingCycle, locale?: string): string {
  return `${formatMoney(money, locale)}/${CYCLE_UNIT[cycle]}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(on: string, days: number): string {
  const date = new Date(`${on}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Add `count` billing cycles. Month math clamps to the last day of the month (Jan 31 + 1 month = Feb 28/29). */
export function addCycle(on: string, cycle: BillingCycle, count = 1): string {
  if (cycle === 'weekly') return addDays(on, 7 * count);
  const months = (cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12) * count;
  const [y, m, d] = on.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
  return toIsoDate(new Date(y, m - 1 + months, Math.min(d, lastDay)));
}

/**
 * Roll a past renewal date forward to the next upcoming one. Always counts from the
 * original anchor so month-end dates don't drift (Jan 31 -> Feb 28 -> Mar 31, not Mar 28).
 */
export function nextRenewalFrom(anchor: string, cycle: BillingCycle, today: string): string {
  let next = anchor;
  for (let n = 1; next < today; n++) next = addCycle(anchor, cycle, n);
  return next;
}

/** The next date the user will be charged, or undefined if unknown or not billing. */
export function nextChargeOn(
  sub: Pick<Subscription, 'status' | 'cycle' | 'billingAnchorOn' | 'trialEndsOn'>,
  today: string,
): string | undefined {
  if (sub.status === 'trial') return sub.trialEndsOn;
  if (sub.status !== 'active' || !sub.billingAnchorOn) return undefined;
  return nextRenewalFrom(sub.billingAnchorOn, sub.cycle, today);
}

/** Whole days from `from` until the ISO date `on` (negative if in the past). */
export function daysUntil(on: string, from: Date = new Date()): number {
  const target = Date.parse(`${on}T00:00:00`);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}
