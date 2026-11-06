import type { PageSnapshot } from '@metonic/core/detect';

/**
 * Capture what checkout detection needs from the current page.
 *
 * Must stay self-contained (no imports or outer variables at runtime): the popup
 * serializes it into `scripting.executeScript({ func })` for "Track this page".
 */
export function takeSnapshot(): PageSnapshot {
  const cardField = document.querySelector(
    [
      'input[autocomplete="cc-number"]',
      'input[name*="cardnumber" i]',
      'input[name*="card-number" i]',
      'input[id*="cardnumber" i]',
      // Hosted payment fields (Stripe, Braintree, Adyen...) live in cross-origin iframes.
      'iframe[src*="js.stripe.com"]',
      'iframe[title*="card" i]',
      'iframe[name*="card" i]',
    ].join(','),
  );
  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText ?? '').slice(0, 20_000),
    hasCardField: cardField !== null,
    lang: document.documentElement.lang,
  };
}
