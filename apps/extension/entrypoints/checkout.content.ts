import { detectCheckout } from '@metonic/core/detect';
import type { DetectedReply, Message } from '../src/messages';
import { showPrompt } from '../src/prompt';
import { takeSnapshot } from '../src/snapshot';

/**
 * Watches for subscription checkouts. Registered at runtime by the background script:
 * on recipe domains by default, on every site if the user grants that permission.
 */
export default defineContentScript({
  registration: 'runtime',
  main(ctx) {
    let lastReported = '';
    let closePrompt: (() => void) | undefined;

    const send = (message: Message) => browser.runtime.sendMessage(message);

    const check = async () => {
      const detection = detectCheckout(takeSnapshot());
      if (!detection.isLikelyCheckout) return;

      const key = `${location.pathname}|${detection.recurring?.price.amountMinor ?? ''}`;
      if (key === lastReported) return;
      lastReported = key;

      const reply: DetectedReply | undefined = await send({
        type: 'checkout-detected',
        page: { url: location.href, title: document.title },
        detection,
      });
      const prompt = reply?.prompt;
      if (!prompt || ctx.isInvalid) return;

      closePrompt?.();
      closePrompt = showPrompt({
        name: prompt.name,
        details: prompt.details,
        onTrack: () => send({ type: 'decide-detection', key: prompt.key, track: true }),
        onDismiss: () => send({ type: 'decide-detection', key: prompt.key, track: false }),
      });
    };

    void check();

    // Single-page checkouts render each step without a navigation.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void check(), 1500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    ctx.onInvalidated(() => {
      observer.disconnect();
      clearTimeout(timer);
      closePrompt?.();
    });
  },
});
