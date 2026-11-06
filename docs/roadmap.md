# Roadmap

The live roadmap is the **[Metonic Roadmap project](https://github.com/users/serge-mugisha/projects/4)**,
organized by [milestones](https://github.com/serge-mugisha/metonic/milestones). This page
is a summary; issues are the source of truth.

## v0.1 Tracker: useful with zero AI

Done in the initial scaffold:
- Subscription model, monthly totals, billing anchors
- Recipe schema v0, validator, JSON Schema for editors
- Heuristic checkout detection (known services after one-click opt-in, all sites optional)
- Notification prompt: "Subscribing to X? Track it"
- Popup: totals, detected, tracked, manual add, "Track this page"
- Trial-ending and renewal reminders

Open:
- [#1](https://github.com/serge-mugisha/metonic/issues/1) Edit a tracked subscription
- [#2](https://github.com/serge-mugisha/metonic/issues/2) Export and import subscriptions as JSON
- [#3](https://github.com/serge-mugisha/metonic/issues/3) Verify the seed recipes
- [#4](https://github.com/serge-mugisha/metonic/issues/4) Info recipes for the 20 most common subscriptions
- [#5](https://github.com/serge-mugisha/metonic/issues/5) Chrome Web Store listing, privacy policy and release workflow
- [#6](https://github.com/serge-mugisha/metonic/issues/6) In-page prompt when a checkout is detected
- [#7](https://github.com/serge-mugisha/metonic/issues/7) Dashboard page
- [#8](https://github.com/serge-mugisha/metonic/issues/8) Locale-aware price parsing
- [#9](https://github.com/serge-mugisha/metonic/issues/9) Detection regression fixtures
- [#10](https://github.com/serge-mugisha/metonic/issues/10) End-to-end smoke test in CI
- [#11](https://github.com/serge-mugisha/metonic/issues/11) Lint and format setup
- [#12](https://github.com/serge-mugisha/metonic/issues/12) Real icon and branding

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
