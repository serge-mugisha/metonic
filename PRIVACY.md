# Privacy policy

_Effective 2026-11-06. Applies to the Metonic browser extension._

**Short version: Metonic has no servers. Your data stays in your browser, and we can't see it.**

## What Metonic stores

The subscriptions you track (name, price, billing cycle, dates, notes), checkouts it detected
and is asking you about, and your settings. All of it is kept in your browser's extension
storage (`chrome.storage.local`) on your device. It is not synced or uploaded anywhere.
Uninstalling the extension deletes it. **Settings → Backup** lets you export it to a file you
control.

## What Metonic reads

On sites you have allowed (the known subscription services, or every site if you opt in),
Metonic reads the visible text of the page and checks whether it has a card-number field.
This lets it recognize a subscription checkout and ask whether you want to track it.

- This check runs entirely inside your browser.
- Page text is never stored or sent anywhere. Metonic keeps only what you see in the prompt:
  the service name, the page address and title, and the price and trial length it found.
- Metonic never reads or stores card numbers, passwords, or form contents.
- "Track this page" reads the current tab once, and only when you click it.

## What Metonic sends

Nothing, by default. There is no analytics, telemetry, crash reporting, advertising, or
account. Metonic makes no network requests of its own.

A future version will let you connect an AI provider of your choice (for example a model
running on your own computer, or a hosted API with your own key) to improve detection. If
you turn that on, the page text Metonic analyzes is sent to **the provider you configured,
directly from your browser**, under that provider's privacy policy. It stays off unless you
set it up, and this policy will be updated before that feature ships.

## Permissions and why they're needed

| Permission | Why |
|---|---|
| `storage` | Save your subscriptions and settings on your device |
| `alarms` | Check twice a day whether a trial ends or a renewal is coming up |
| `notifications` | Remind you before a trial ends or a subscription renews |
| `scripting` | Run the checkout detector on sites you allowed, and read a page when you click "Track this page" |
| `activeTab` | Let "Track this page" read only the tab you're on, only when you click it |
| Site access (optional) | Requested at runtime, never at install. You choose the known subscription services, every site, or none |

## Selling or sharing data

Metonic doesn't collect your data, so there is nothing to sell or share.

## Changes and contact

Changes to this policy are made in the public repository, so its history is visible. For
questions, open an issue at https://github.com/serge-mugisha/metonic/issues. Report security
problems privately as described in [SECURITY.md](SECURITY.md).
