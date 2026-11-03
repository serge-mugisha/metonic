# Roadmap

The live roadmap is the GitHub Project board. This file is the plan it was seeded from.

## v0.1 Tracker: useful with zero AI

- [x] Subscription model, monthly totals, billing anchors
- [x] Recipe schema v0, validator, JSON Schema for editors
- [x] Heuristic checkout detection (known services by default, all sites opt-in)
- [x] Notification prompt: "Subscribing to X? Track it"
- [x] Popup: totals, detected, tracked, manual add, "Track this page"
- [x] Trial-ending and renewal reminders
- [ ] Edit a tracked subscription (price, cycle, dates, status)
- [ ] In-page prompt (shadow-DOM toast) as an alternative to system notifications
- [ ] Full dashboard page (options page / side panel): spend by category, upcoming charges calendar
- [ ] Export/import JSON (backup, moving browsers)
- [ ] Locale-aware price parsing (e.g. `9,99 €/Monat`), `$` disambiguation by page locale
- [ ] Detection fixtures: saved HTML of real checkouts as regression tests
- [ ] 20 `info` recipes for the most common services, verified
- [ ] Real icon and branding
- [ ] Chrome Web Store listing + privacy policy

## v0.2 Actions

- [ ] Recipe engine: `guided` (highlight overlay) and `automated` (with confirm gates), domain-scoped
- [ ] Recipe recorder: record a manual cancellation and export a recipe draft
- [ ] "Recipe broken" flow: one-click prefilled GitHub issue
- [ ] Vacation mode: pick dates → pause where native, else cancel at period end + resubscribe reminder
- [ ] App-store billing hints (Apple/Google/Amazon): deep links to the right settings page
- [ ] 10 `guided`/`automated` recipes for top services

## v0.3 AI (bring your own)

- [ ] AI provider interface + settings UI
- [ ] Chrome built-in AI (Prompt API) provider with capability check
- [ ] OpenAI-compatible provider (Ollama, LM Studio, OpenRouter, ...) incl. Ollama CORS setup guide
- [ ] Anthropic provider
- [ ] AI-refined detection for low-confidence pages (structured output)
- [ ] AI recipe drafting from recordings
- [ ] AI agent fallback for broken/missing recipes, domain-scoped with confirm gates and prompt-injection defenses

## Later

- Firefox and Edge builds (WXT supports both)
- Optional sync via storage the user owns (file, WebDAV, ...)
- Gmail web-UI receipt import (no Gmail API)
- MCP server so desktop AI assistants can query and manage subscriptions
- Mobile companion (reminders + dashboard)
- User Scripts API path for opt-in community recipe packs between releases
