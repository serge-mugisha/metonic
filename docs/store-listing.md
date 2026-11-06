# Chrome Web Store listing

Source of truth for the store listing, so changes go through review like code.

## Basics

| Field | Value |
|---|---|
| Name | Metonic |
| Category | Productivity → Tools |
| Language | English |
| Homepage | https://github.com/serge-mugisha/metonic |
| Support | https://github.com/serge-mugisha/metonic/issues |
| Privacy policy | https://github.com/serge-mugisha/metonic/blob/main/PRIVACY.md |

## Summary (132 characters max)

> Track every subscription, get reminded before free trials convert, and find the right cancel page. Open source, no account.

## Description

> Metonic keeps all your subscriptions in one list and makes sure a free trial never turns into a charge you forgot about.
>
> **Notices when you subscribe.** When you're on a subscription checkout, Metonic asks "Subscribing to Netflix? Track it". The price, billing cycle and trial length are filled in for you. Works out of the box on 20+ popular services, and on any site if you allow it.
>
> **Reminds you before you pay.** Get a notification a few days before a trial ends or a subscription renews.
>
> **See what you spend.** Monthly and yearly totals, the next 30 days of charges, and spending by category.
>
> **Cancel without hunting.** For known services, "Cancel…" opens the right account page with the steps, and tells you when you have to cancel through Apple, Google or your phone company instead.
>
> **Private by design.**
> • Your data stays in your browser. No account, no server, no bank login.
> • Pages are checked locally. Nothing is sent anywhere.
> • No ads, no tracking, no analytics.
> • Open source (AGPL-3.0). Read the code or help add services: github.com/serge-mugisha/metonic
>
> Coming next: guided cancel and pause, a vacation mode that pauses everything at once, and optional bring-your-own AI (Chrome's built-in model, a local model, or your own API key).

## Single purpose

> Help the user keep track of their online subscriptions: notice subscription checkouts, list subscriptions with their costs and renewal dates, remind the user before charges, and point them to each service's cancellation page.

## Permission justifications

| Permission | Justification for reviewers |
|---|---|
| `storage` | Stores the user's tracked subscriptions and settings locally. Nothing is synced or transmitted. |
| `alarms` | A twice-daily alarm checks for upcoming trial ends and renewals to send reminders. |
| `notifications` | Shows reminders before a trial ends or a subscription renews, and optionally asks whether to track a detected checkout. |
| `scripting` | Registers the checkout-detection content script, only on origins the user granted at runtime. Also injects a one-time snapshot function into the active tab when the user clicks "Track this page". |
| `activeTab` | Lets "Track this page" read the current tab only after the user clicks it, without broad host access. |
| Optional host permissions (`<all_urls>`) | Nothing is granted at install. From the welcome page or settings, the user can grant the known subscription services (one prompt) or every site. The content script reads visible text to recognize a subscription checkout, locally. |
| Remote code | **None.** All code and service recipes are bundled in the package. Recipes are declarative data validated at build time; nothing is fetched or evaluated at runtime. |

## Data usage disclosures (Privacy practices tab)

- Collects: **none** of the listed categories. Data is processed locally and never transmitted to the developer or third parties.
- Certify: no selling of user data; no use or transfer for purposes unrelated to the single purpose; no use for creditworthiness or lending.

## Assets

| Asset | Size | Status |
|---|---|---|
| Icon | 128×128 | `apps/extension/public/icon/128.png` (see #12) |
| Screenshots | 1280×800, 1–5 | TODO: popup with list, in-page prompt, overview, settings, welcome |
| Small promo tile | 440×280 | TODO |

## Releasing

1. Merge to `main` with CI green.
2. Tag: `git tag v0.1.0 && git push origin v0.1.0`. The Release workflow builds, tests, and attaches `metonic-0.1.0-chrome.zip` to a GitHub Release.
3. Upload that zip in the Chrome Web Store developer dashboard.

Recipe fixes ship only in releases (store policy forbids fetching them remotely), so aim for a regular cadence, for example every two weeks when recipes have changed.
