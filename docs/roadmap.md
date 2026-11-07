# Roadmap

The live roadmap is the **[Metonic Roadmap project](https://github.com/users/serge-mugisha/projects/4)**,
organized by [milestones](https://github.com/serge-mugisha/metonic/milestones). This page
is a summary; issues are the source of truth.

## v0.1 Tracker: useful with zero AI

Done (first pre-release: [v0.1.0-beta.1](https://github.com/serge-mugisha/metonic/releases/tag/v0.1.0-beta.1)):
- Subscription model, monthly/yearly totals, billing anchors, correct minor units per currency
- Recipe schema v0 with validator and JSON Schema, plus 23 services (`info` level, unverified)
- Heuristic checkout detection in a dozen languages, with 23 regression fixtures
- In-page "Subscribing to X? Track it" prompt, or system notification, or both
- Popup: totals, detected, tracked, edit, "Track this page", manual add
- Overview page: upcoming charges, spend by category, cancelled savings
- Settings: detection access, reminder lead time, JSON export/import
- Trial-ending and renewal reminders
- All site access optional, with a welcome page (no install-time host permissions)
- Lint, unit tests, browser e2e in CI; tag-driven release workflow; privacy policy; icon

Open:
- [#3](https://github.com/serge-mugisha/metonic/issues/3) Verify recipes on real accounts (needs people with subscriptions)
- [#5](https://github.com/serge-mugisha/metonic/issues/5) First Chrome Web Store submission

## v0.2 Actions

- [#13](https://github.com/serge-mugisha/metonic/issues/13) Recipe engine: guided level
- [#14](https://github.com/serge-mugisha/metonic/issues/14) Recipe engine: automated level with confirm gates
- [#15](https://github.com/serge-mugisha/metonic/issues/15) Vacation mode
- [#16](https://github.com/serge-mugisha/metonic/issues/16) Recipe recorder
- [#17](https://github.com/serge-mugisha/metonic/issues/17) "Recipe broken" one-click report
- [#18](https://github.com/serge-mugisha/metonic/issues/18) Third-party billing hints
- [#19](https://github.com/serge-mugisha/metonic/issues/19) Guided/automated recipes for 10 top services

## v0.3 AI (bring your own)

- [#20](https://github.com/serge-mugisha/metonic/issues/20) AI provider interface and settings
- [#21](https://github.com/serge-mugisha/metonic/issues/21) Chrome built-in AI provider (Gemini Nano)
- [#22](https://github.com/serge-mugisha/metonic/issues/22) OpenAI-compatible provider (Ollama, LM Studio, OpenRouter, ...)
- [#23](https://github.com/serge-mugisha/metonic/issues/23) Anthropic provider
- [#24](https://github.com/serge-mugisha/metonic/issues/24) AI-refined detection
- [#25](https://github.com/serge-mugisha/metonic/issues/25) AI-drafted recipes from recordings
- [#26](https://github.com/serge-mugisha/metonic/issues/26) AI agent fallback for broken or missing recipes

## Later

- [#27](https://github.com/serge-mugisha/metonic/issues/27) Firefox and Edge builds
- [#28](https://github.com/serge-mugisha/metonic/issues/28) Optional sync via user-owned storage
- [#29](https://github.com/serge-mugisha/metonic/issues/29) Gmail web-UI receipt import
- [#30](https://github.com/serge-mugisha/metonic/issues/30) MCP server
- [#31](https://github.com/serge-mugisha/metonic/issues/31) Mobile companion app
- [#32](https://github.com/serge-mugisha/metonic/issues/32) Community recipe packs via the User Scripts API
