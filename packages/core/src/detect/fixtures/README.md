# Detection fixtures

Each JSON file is a snapshot of one page plus what `detectCheckout` should say about it.
`fixtures.test.ts` runs all of them. They are the main safety net when tuning the
heuristics: every change has to keep them passing.

```jsonc
{
  "description": "What kind of page this is, in one line",
  "source": "Where it came from: 'captured from <site> on 2026-11-06' or 'synthetic, modeled on ...'",
  "url": "https://...",
  "title": "Page title",
  "lang": "en-US",            // <html lang>, optional
  "hasCardField": true,
  "text": "Visible page text ...",
  "expected": {
    "isLikelyCheckout": true,
    "recurring": { "price": { "amountMinor": 1799, "currency": "USD" }, "cycle": "monthly" },
    "trial": null              // null = must be absent; leave the key out = don't care
  },
  "knownIssue": "optional: why this is wrong today"
}
```

Name files `pos-*.json` for subscription checkouts and `neg-*.json` for pages that must not
trigger a prompt (pricing pages, one-off purchases, donations, account settings, articles).
Negatives are as valuable as positives: false prompts are what make people uninstall.

If the detector gets a fixture wrong and you can't fix it yet, add `knownIssue` with a short
explanation. The test then expects it to fail, so whoever fixes it is reminded to remove the flag.

## Capturing a real page

1. Go to the checkout page, **stop before paying**, and open DevTools (F12) → Console.
2. Paste this and press Enter. It copies a fixture to your clipboard:

   ```js
   copy(JSON.stringify({
     description: '', source: `captured from ${location.hostname} on ${new Date().toISOString().slice(0, 10)}`,
     url: location.href, title: document.title, lang: document.documentElement.lang,
     hasCardField: !!document.querySelector('input[autocomplete="cc-number"],input[name*="cardnumber" i],iframe[src*="js.stripe.com"],iframe[title*="card" i]'),
     text: document.body.innerText.slice(0, 20000),
     expected: { isLikelyCheckout: true },
   }, null, 2))
   ```

3. Paste into a new file here and **remove personal data** before committing:
   - your name, email, address, phone number
   - any part of a card number, account IDs, order numbers
   - tokens or session IDs in the URL (keep the path, drop the query string if it holds IDs)
4. Trim the text to what matters (plan, price, terms, buttons). Keep the original wording.
5. Fill in `description` and `expected`, then run `npm test`.
