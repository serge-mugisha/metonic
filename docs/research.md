# Research notes

Findings that shaped Metonic's design, with sources. Last reviewed: 2026-11-03.
When something here changes (a policy, an API status), update this file and the
decision it affected in [architecture.md](architecture.md).

## Landscape

| Product | Approach | Price | Gap Metonic targets |
|---|---|---|---|
| Rocket Money | Bank linking (Plaid), human concierge cancels; AI agent "Rowan" (Aug 2026, built with Anthropic) cancels over SMS | Premium ~$6–14/mo, Premium+ $15/mo | Requires bank access, closed, US-only, only sees subscriptions after the first charge |
| Trim, Monarch, Copilot | Bank linking, tracking/budgeting | Paid | Track only |
| Chargeback | Inbox scanning + AI agents | Pricing unclear | Reviews report delays and mixed results |
| Pine AI | AI phone calls | Paid | Phone-only |
| Privacy.com | Virtual card per merchant, pause/close card | Free (12 cards/mo), Pro $10, Premium $25 | Blocks payment, doesn't cancel the account |
| Visa Enhanced Subscription Manager | In bank apps via issuers; 150+ merchants via Pinwheel | Free via your bank | Rolling out to North American banks from summer 2026 |
| General agents (ChatGPT agent, Chrome Auto Browse) | Generic browser automation | Paid AI plans | No memory of your subscriptions, no maintained flows |
| Wallos (OSS) | Self-hosted manual tracker, GPL-3.0 | Free | Manual entry, no detection, can't act |
| Chrome extensions (SubWatch, SubBuddy, ...) | Gmail receipt scanning, reminders | Freemium | Track only |

Nobody combines: open source + local-first + detection at signup time + maintained
cancel/pause flows + bring-your-own-AI.

## Pause is rarely a real feature

There is no standard pause. Where it exists it is usually a retention offer inside the
cancel flow, and it auto-resumes (Hulu up to 12 weeks; Xbox Game Pass reportedly up to
3 months; YouTube Premium offers pause in its cancel flow). Sources disagree on Netflix
and Spotify. "Vacation mode" therefore has to combine: native pause where available,
otherwise cancel at period end plus a resubscribe reminder. Per-service facts live in
each recipe's `pause` block and must be verified by contributors.

## Chrome built-in AI (Gemini Nano)

- **Prompt API (`LanguageModel`) is stable for extensions since Chrome 138** (web pages:
  Chrome 148). No API key, no per-token cost, runs on device.
- API: `LanguageModel.availability()`, `LanguageModel.create({ initialPrompts,
  expectedInputs, expectedOutputs, temperature, topK, monitor })`, `session.prompt()`,
  `session.promptStreaming()`. **Structured output** via
  `responseConstraint: <JSON Schema>`. Inputs: text, image, audio. Languages: en, ja,
  es, de, fr.
- Extensions can set `temperature`/`topK` (both or neither). Remove the expired
  `aiLanguageModelOriginTrial` permission if copying old samples.
- Available in top-level windows and same-origin iframes; **not in Web Workers**. The
  docs don't cover MV3 service workers, so plan to call it from extension pages or an
  offscreen document.
- **Hardware:** Windows 10/11, macOS 13+, Linux, or Chromebook Plus. ≥22 GB free disk;
  GPU with >4 GB VRAM, or 16 GB RAM + 4 CPU cores. Not on Android or iOS. The model
  downloads on first use and is removed if free space drops below 10 GB.
- Other built-in APIs: Summarizer is stable (Chrome 138); Writer, Rewriter and
  Proofreader were still in trials at last check.

**Implication:** Gemini Nano is a free, zero-setup tier for small tasks (classifying a
page as a checkout, extracting price/cycle/trial). Many machines can't run it, so it
is an optional enhancer. The heuristics must work without it.

## Other AI providers

- **Ollama** rejects requests from extensions by default (403 or CORS error). The user
  must set `OLLAMA_ORIGINS=chrome-extension://*` (or the exact extension origin) and
  restart Ollama. Don't recommend `OLLAMA_ORIGINS=*` or `OLLAMA_HOST=0.0.0.0`, which
  expose the API to websites or the network.
- Ollama also exposes an OpenAI-compatible API, so one "OpenAI-compatible" provider
  covers Ollama, LM Studio, OpenRouter and most hosted APIs. Anthropic gets its own
  provider.
- Prior art: **Nanobrowser** (Apache-2.0, on the Chrome Web Store) is an open-source
  bring-your-own-key browser agent supporting OpenAI, Anthropic, Gemini and Ollama.
  Useful reference for the agent fallback.

## Chrome Web Store policy: recipes must ship in the package

The Manifest V3 policy prohibits remotely hosted code, and explicitly includes
"building an interpreter for remotely fetched commands, **even if those commands are
fetched as data**." Fetching remote config is allowed only "where all logic for the
functionality is contained within the extension package."

**Implication:** automated recipes are commands, so **recipes are bundled into each
release** and never fetched at runtime. Recipe updates ship as extension updates. The
only documented escape hatch is the **User Scripts API** (`chrome.userScripts`): Chrome
138+ requires a per-extension "Allow User Scripts" toggle, for scripts the user supplies.
That's a possible future path for user-installed community recipe packs, not v0.

## Gmail access

`gmail.readonly` is a Google **restricted scope**. A public app needs OAuth verification
plus an annual third-party security assessment (CASA), commonly quoted at
$15k–$75k/year. Google's policy wording on whether purely on-device processing is exempt
is ambiguous. **Decision:** no Gmail API. Alternatives: read receipts from the Gmail
web UI while the user has it open (content script, user-initiated), or paste/forward a
receipt.

## Tooling

- **WXT** is the default MV3 framework in 2026 (v0.21.x): multi-browser builds, file-
  based entrypoints, built-in storage, runtime-registered content scripts. Plasmo
  development has slowed; CRXJS is Chromium-only and less maintained.

## Legal context (US)

The FTC's 2024 "click-to-cancel" rule was vacated by the Eighth Circuit on
2025-07-08. The FTC opened a new rulemaking (ANPRM) in 2026; nothing final as of the
last sources checked. ROSCA enforcement continues. Dark-pattern cancel flows will
persist, which is why maintained recipes are valuable.

## Sources

- Rocket Money Rowan: https://www.rocketmoney.com/learn/personal-finance/what-is-rowan,
  https://fintech.global/2026/09/03/rocket-money-launches-ai-agent-to-manage-finances/
- Rocket Money pricing: https://www.fincomparelab.com/guides/rocket-money-pricing/
- Visa Enhanced Subscription Manager: https://www.businesswire.com/news/home/20260326149948/en/
- Privacy.com pricing: https://www.privacy.com/pricing
- Chargeback review: https://orbitmoney.io/compare/chargeback-app-review
- Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Built-in AI API status: https://developer.chrome.com/docs/ai/built-in-apis
- MV3 policy: https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- Remote code guidance: https://developer.chrome.com/docs/extensions/develop/migrate/improve-security
- User Scripts API: https://developer.chrome.com/docs/extensions/reference/api/userScripts
- Gmail restricted scopes / CASA: https://deepstrike.io/blog/google-casa-security-assessment-2025,
  https://www.gmass.co/blog/google-oauth-verification-security-assessment/
- Ollama + extensions CORS: https://objectgraph.com/blog/ollama-cors/
- Nanobrowser: https://github.com/nanobrowser/nanobrowser
- WXT comparison: https://wxt.dev/guide/resources/compare
- WXT runtime content scripts: https://wxt.dev/api/reference/wxt/interfaces/BaseContentScriptEntrypointOptions
- FTC click-to-cancel: https://www.jdsupra.com/legalnews/ftc-steps-up-subscription-enforcement-4518749/
- Pause policies: https://www.lowermysubs.com/blog/how-to-cancel-streaming-subscriptions,
  https://recurdash.com/guides/how-to-cancel-xbox-game-pass
