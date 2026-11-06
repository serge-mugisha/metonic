import type { Subscription } from '@metonic/core';
import type { CheckoutDetection } from '@metonic/core/detect';

/** A checkout we noticed and are asking the user about. */
export interface PendingDetection {
  /** Recipe id for known services, otherwise the bare hostname. */
  key: string;
  serviceId?: string;
  name: string;
  url: string;
  pageTitle: string;
  detection: CheckoutDetection;
  detectedAt: string;
}

/** How to ask about a detected checkout. */
export type PromptStyle = 'page' | 'notification' | 'both';

export interface Settings {
  /** Days before a trial ends or a renewal to send a reminder. */
  reminderDays: number;
  prompt: PromptStyle;
}

export const DEFAULT_SETTINGS: Settings = { reminderDays: 3, prompt: 'page' };

export const subscriptions = storage.defineItem<Subscription[]>('local:subscriptions', { fallback: [] });

export const pendingDetections = storage.defineItem<PendingDetection[]>('local:pendingDetections', {
  fallback: [],
});

/** key -> ISO timestamp the user dismissed it, so we don't nag on every visit. */
export const dismissedDetections = storage.defineItem<Record<string, string>>('local:dismissedDetections', {
  fallback: {},
});

/** `${subscriptionId}:${date}` keys we already sent a reminder for. */
export const sentReminders = storage.defineItem<Record<string, true>>('local:sentReminders', { fallback: {} });

// Stored partially so settings added in later versions pick up their defaults.
const storedSettings = storage.defineItem<Partial<Settings>>('local:settings', { fallback: {} });

export const settings = {
  async getValue(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...(await storedSettings.getValue()) };
  },
  async update(patch: Partial<Settings>): Promise<void> {
    await storedSettings.setValue({ ...(await storedSettings.getValue()), ...patch });
  },
  watch(cb: (value: Settings) => void): () => void {
    return storedSettings.watch((value) => cb({ ...DEFAULT_SETTINGS, ...value }));
  },
};
