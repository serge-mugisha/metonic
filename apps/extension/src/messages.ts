import type { CheckoutDetection } from '@metonic/core/detect';

export type Message = {
  type: 'checkout-detected';
  page: { url: string; title: string };
  detection: CheckoutDetection;
};
