import type { CheckoutDetection } from '@metonic/core/detect';

/** Content script -> background. */
export type Message =
  | { type: 'checkout-detected'; page: { url: string; title: string }; detection: CheckoutDetection }
  | { type: 'decide-detection'; key: string; track: boolean };

/** Background's reply to `checkout-detected`: what, if anything, to show on the page. */
export interface DetectedReply {
  prompt?: { key: string; name: string; details: string };
}
