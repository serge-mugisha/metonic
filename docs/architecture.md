# Architecture

## Principles

1. **Local-first.** Subscription data lives in the browser (`chrome.storage.local`).
   No Metonic server, no account, no telemetry by default.
2. **Useful without AI.** Tracking, detection, reminders and recipes work with zero AI
   configured. AI makes things better; it is never required.
3. **AI-native, not AI-dependent.** AI writes and repairs recipes, and is the fallback
   when no recipe exists. Deterministic recipes do the work when one exists.
4. **No required fees.** Nothing in the default setup costs the project or the user
   money: no bank aggregators, no restricted Google scopes, no hosted backend.
5. **Least privilege.** No host access at install. The user grants the known services
   (one click on the welcome page) and, separately, every site if they want.

## Layout

```
packages/core     Browser-safe domain logic: subscription model, recipe schema, checkout detection
recipes/          Community recipes (services/*.yaml), loader, validator CLI, JSON Schema
apps/extension    WXT (Manifest V3) extension: background, content script, popup
docs/             Research, architecture, recipe spec, roadmap
```

`@metonic/core` ships TypeScript source (no build step). `@metonic/core/detect` is a
separate entry so the content script doesn't pull in Zod.

## Extension

| Piece | Role |
|---|---|
| `entrypoints/background.ts` | Registers the checkout detector, stores detections, sends notifications and reminders (12h alarm) |
| `entrypoints/checkout.content.ts` | Runs heuristics on page load and DOM changes; reports likely checkouts |
| `entrypoints/popup/` | Totals, detected items, tracked subscriptions, manual add, "Track this page", permissions toggle |
| `src/actions.ts` | All storage mutations (track, dismiss, add, update, remove) |
| `src/storage.ts` | Typed WXT storage items |

### Detection flow

1. The content script is **registered at runtime** (`scripting.registerContentScripts`)
   only on origins the user has granted: the known services, or every site if they
   granted `<all_urls>`. It's re-registered whenever permissions change.
2. `detectCheckout()` scores signals: card field (including Stripe/Braintree iframes),
   checkout-like URL, recurring price, trial wording, subscription vocabulary, and
   commit buttons like "Start membership". It flags a page only above a threshold
   **and** with a card field or commit button, so plain pricing pages don't trigger.
3. The background script stores a pending detection and shows a notification with
   **Track it / Not now** buttons. "Not now" mutes that service for 30 days.
4. "Track this page" in the popup uses `activeTab` + `scripting.executeScript`, so it
   works on any site without broad permissions.

### Dates and money

- Money is stored in minor units with an ISO currency. Totals are grouped by
  currency; nothing converts implicitly.
- Each subscription stores a **billing anchor** (any known renewal date). The next
  charge is computed from the anchor (`nextChargeOn`), so month-end dates don't drift.

## Recipes

Declarative YAML validated by Zod (`packages/core/src/recipe/schema.ts`), described in
[recipe-spec.md](recipe-spec.md). Three levels: `info` → `guided` → `automated`.

**Recipes ship inside the extension package.** `wxt.config.ts` loads and validates
them at build time and inlines them as `__METONIC_RECIPES__`. The extension never
fetches recipes remotely. Chrome Web Store policy bans interpreting remotely fetched
commands even when they are data (see [research.md](research.md#chrome-web-store-policy-recipes-must-ship-in-the-package)).

**All site access is optional.** The manifest has no `host_permissions`, only
`optional_host_permissions: ['<all_urls>']`. Recipe domains become match patterns that
are requested at runtime (`src/permissions.ts`). This matters because Chrome disables
an extension on update when new host permissions change its warning, so if recipe
domains were required permissions, every release that adds a recipe would switch
Metonic off for everyone. With optional access, a release that adds services just
makes the popup say "Detection is off for N newly supported services · Turn on".
The e2e build (`--mode e2e`) pre-grants the recipe hosts because tests can't click
Chrome's permission dialog.

Safety rules enforced by the schema:
- `https` URLs only; strict keys (typos fail validation).
- Each domain belongs to exactly one recipe.
- `automated` actions must contain a `confirm` step before the final click.
- The recipe engine (v0.2) will only run a recipe's steps on that recipe's domains.

## AI (planned, v0.3)

A provider interface with three implementations:

| Provider | Setup | Use |
|---|---|---|
| Chrome built-in (Gemini Nano, Prompt API) | None, if the device qualifies | Checkout classification, field extraction (`responseConstraint` for JSON) |
| OpenAI-compatible | Base URL + optional key | Ollama, LM Studio, OpenRouter, OpenAI... |
| Anthropic | API key | Claude |

Uses, in order of priority:
1. **Refine detection** when heuristics are unsure (classify + extract with structured output).
2. **Draft recipes** from a recorded manual cancellation → contributor reviews → PR.
3. **Agent fallback** for broken or missing recipes: scoped to the service's domains,
   confirmation before any irreversible click, treats page content as untrusted
   (prompt-injection aware).

The Prompt API isn't available in Web Workers, so AI calls run from extension pages
or an offscreen document, not the service worker.

## Out of scope (by decision)

- Bank or card linking (Plaid etc.): fees, and the data never needs to leave the browser.
- Gmail API (`gmail.readonly` needs an annual paid security assessment).
- Issuing virtual cards (needs a regulated issuing partner).
- Remote recipe updates (store policy). Possible later via the User Scripts API, opt-in.
