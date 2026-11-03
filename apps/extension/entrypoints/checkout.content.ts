import { detectCheckout } from '@metonic/core/detect';
import type { Message } from '../src/messages';
import { takeSnapshot } from '../src/snapshot';

/**
 * Watches for subscription checkouts. Registered at runtime by the background script:
 * on recipe domains by default, on every site if the user grants that permission.
 */
export default defineContentScript({
  registration: 'runtime',
  main(ctx) {
    let lastReported = '';

    const check = () => {
      const detection = detectCheckout(takeSnapshot());
      if (!detection.isLikelyCheckout) return;

      const key = `${location.pathname}|${detection.recurring?.price.amountMinor ?? ''}`;
      if (key === lastReported) return;
      lastReported = key;

      const message: Message = {
        type: 'checkout-detected',
        page: { url: location.href, title: document.title },
        detection,
      };
      void browser.runtime.sendMessage(message);
    };

    check();

    // Single-page checkouts render each step without a navigation.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(check, 1500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    ctx.onInvalidated(() => {
      observer.disconnect();
      clearTimeout(timer);
    });
  },
});
