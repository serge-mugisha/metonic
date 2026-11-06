import {
  addCycle,
  addDays,
  createExport,
  findRecipeForHost,
  type ImportResult,
  isDetectionPath,
  mergeImport,
  type Subscription,
  toIsoDate,
} from '@metonic/core';
import type { CheckoutDetection } from '@metonic/core/detect';
import { recipes } from './recipes';
import { dismissedDetections, type PendingDetection, pendingDetections, subscriptions } from './storage';

const DISMISS_FOR_DAYS = 30;
const MAX_PENDING = 20;

/** Record a detected checkout. Returns the pending entry, or undefined if we shouldn't ask. */
export async function recordDetection(
  page: { url: string; title: string },
  detection: CheckoutDetection,
): Promise<PendingDetection | undefined> {
  const host = new URL(page.url).hostname.replace(/^www\./, '');
  const recipe = findRecipeForHost(recipes, host);
  // Big sites (Amazon) sell one-off things too; only their signup pages count.
  if (recipe && !isDetectionPath(recipe, page.url)) return;
  const key = recipe?.id ?? host;

  const tracked = await subscriptions.getValue();
  if (tracked.some((s) => (s.serviceId ?? hostKey(s.sourceUrl)) === key && s.status !== 'cancelled')) return;

  const dismissedAt = (await dismissedDetections.getValue())[key];
  if (dismissedAt && Date.now() - Date.parse(dismissedAt) < DISMISS_FOR_DAYS * 86_400_000) return;

  const entry: PendingDetection = {
    key,
    ...(recipe && { serviceId: recipe.id }),
    name: recipe?.name ?? host,
    url: page.url,
    pageTitle: page.title,
    detection,
    detectedAt: new Date().toISOString(),
  };
  const pending = (await pendingDetections.getValue()).filter((p) => p.key !== key);
  await pendingDetections.setValue([entry, ...pending].slice(0, MAX_PENDING));
  return entry;
}

export async function trackDetection(key: string): Promise<Subscription | undefined> {
  const pending = await pendingDetections.getValue();
  const entry = pending.find((p) => p.key === key);
  if (!entry) return;

  const today = toIsoDate(new Date());
  const { recurring, trial } = entry.detection;
  const trialEndsOn = trial?.days ? addDays(today, trial.days) : undefined;
  const now = new Date().toISOString();

  const cycle = recurring?.cycle ?? 'monthly';
  const sub: Subscription = {
    id: crypto.randomUUID(),
    ...(entry.serviceId && { serviceId: entry.serviceId }),
    name: entry.name,
    // Unknown prices are saved as 0 and flagged in the UI for the user to fill in.
    price: recurring?.price ?? { amountMinor: 0, currency: 'USD' },
    cycle,
    status: trial ? 'trial' : 'active',
    startedOn: today,
    // Billing starts when a trial ends; otherwise today's checkout is the first charge
    // and the next one is a cycle away.
    billingAnchorOn: trialEndsOn ?? addCycle(today, cycle),
    ...(trialEndsOn && { trialEndsOn }),
    source: 'detected',
    sourceUrl: entry.url,
    createdAt: now,
    updatedAt: now,
  };

  await subscriptions.setValue([...(await subscriptions.getValue()), sub]);
  await pendingDetections.setValue(pending.filter((p) => p.key !== key));
  return sub;
}

export async function dismissDetection(key: string): Promise<void> {
  await pendingDetections.setValue((await pendingDetections.getValue()).filter((p) => p.key !== key));
  await dismissedDetections.setValue({ ...(await dismissedDetections.getValue()), [key]: new Date().toISOString() });
}

export async function addSubscription(input: SubscriptionFields): Promise<void> {
  const now = new Date().toISOString();
  await subscriptions.setValue([
    ...(await subscriptions.getValue()),
    { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now },
  ]);
}

export type SubscriptionFields = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;

/** Replace every user-editable field of a subscription, keeping its identity. */
export async function replaceSubscription(id: string, fields: SubscriptionFields): Promise<void> {
  const now = new Date().toISOString();
  await subscriptions.setValue(
    (await subscriptions.getValue()).map((s) =>
      s.id === id ? { ...fields, id, createdAt: s.createdAt, updatedAt: now } : s,
    ),
  );
}

export async function exportSubscriptions(): Promise<string> {
  return JSON.stringify(createExport(await subscriptions.getValue()), null, 2);
}

/** Validates the whole file first, then writes once, so a bad file can't half-import. */
export async function importSubscriptions(text: string): Promise<ImportResult> {
  const result = mergeImport(text, await subscriptions.getValue());
  await subscriptions.setValue(result.subscriptions);
  return result;
}

export async function updateSubscription(id: string, patch: Partial<Subscription>): Promise<void> {
  const now = new Date().toISOString();
  await subscriptions.setValue(
    (await subscriptions.getValue()).map((s) => (s.id === id ? { ...s, ...patch, id, updatedAt: now } : s)),
  );
}

export async function removeSubscription(id: string): Promise<void> {
  await subscriptions.setValue((await subscriptions.getValue()).filter((s) => s.id !== id));
}

function hostKey(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
