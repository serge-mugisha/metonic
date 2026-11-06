import { addCycle, addDays, type Category, monthlyCostMinor, nextChargeOn, type Subscription } from './subscription';

/** Totals keyed by currency. We never convert currencies implicitly. */
export type PerCurrency = Record<string, number>;

function add(totals: PerCurrency, currency: string, amount: number) {
  if (amount !== 0) totals[currency] = (totals[currency] ?? 0) + amount;
}

/** Yearly cost of active subscriptions, per currency. Computed from the price, not from 12 x the rounded monthly. */
export function yearlyTotals(subs: Subscription[]): PerCurrency {
  const perYear = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 } as const;
  const totals: PerCurrency = {};
  for (const sub of subs) {
    if (sub.status === 'active') add(totals, sub.price.currency, sub.price.amountMinor * perYear[sub.cycle]);
  }
  return totals;
}

export interface CategorySpend {
  category: Category;
  monthlyMinor: number;
  count: number;
}

/** Monthly spend per category for each currency, largest first. Only active subscriptions cost money. */
export function spendByCategory(
  subs: Subscription[],
  categoryOf: (sub: Subscription) => Category,
): Record<string, CategorySpend[]> {
  const byCurrency: Record<string, Map<Category, CategorySpend>> = {};
  for (const sub of subs) {
    const monthlyMinor = monthlyCostMinor(sub);
    if (monthlyMinor === 0) continue;
    const category = categoryOf(sub);
    const map = byCurrency[sub.price.currency] ?? new Map<Category, CategorySpend>();
    byCurrency[sub.price.currency] = map;
    const entry = map.get(category) ?? { category, monthlyMinor: 0, count: 0 };
    entry.monthlyMinor += monthlyMinor;
    entry.count++;
    map.set(category, entry);
  }
  return Object.fromEntries(
    Object.entries(byCurrency).map(([currency, map]) => [
      currency,
      [...map.values()].sort((a, b) => b.monthlyMinor - a.monthlyMinor),
    ]),
  );
}

export interface UpcomingCharge {
  sub: Subscription;
  on: string;
  kind: 'trial-end' | 'renewal';
}

/**
 * Every charge in [today, today + days], soonest first. Weekly subscriptions can appear
 * several times. On the same day, trials ending sort first: they're the ones to act on.
 */
export function upcomingCharges(subs: Subscription[], today: string, days = 30): UpcomingCharge[] {
  const until = addDays(today, days);
  const charges: UpcomingCharge[] = [];
  for (const sub of subs) {
    const first = nextChargeOn(sub, today);
    if (!first || first > until) continue;
    if (sub.status === 'trial') {
      if (first >= today) charges.push({ sub, on: first, kind: 'trial-end' });
      continue;
    }
    for (let n = 0, on = first; on <= until; on = addCycle(first, sub.cycle, ++n)) {
      charges.push({ sub, on, kind: 'renewal' });
    }
  }
  return charges.sort((a, b) => a.on.localeCompare(b.on) || (a.kind === b.kind ? 0 : a.kind === 'trial-end' ? -1 : 1));
}

/** What cancelled subscriptions would cost per month today, per currency. */
export function savedPerMonth(subs: Subscription[]): PerCurrency {
  const totals: PerCurrency = {};
  for (const sub of subs) {
    if (sub.status === 'cancelled') add(totals, sub.price.currency, monthlyCostMinor({ ...sub, status: 'active' }));
  }
  return totals;
}
