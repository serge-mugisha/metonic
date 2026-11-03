import type { CheckoutDetection } from '@metonic/core/detect';
import type { Subscription } from '@metonic/core';

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

export interface Settings {
  /** Days before a trial ends or a renewal to send a reminder. */
  reminderDays: number;
}

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

export const settings = storage.defineItem<Settings>('local:settings', { fallback: { reminderDays: 3 } });
