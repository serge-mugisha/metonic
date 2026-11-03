# Metonic

**Every subscription in one place: open source, local-first, bring your own AI.**

Metonic is a browser extension that notices when you sign up for a subscription,
reminds you before free trials convert or plans renew, and helps you cancel or pause
using community-maintained "recipes" for each service.

> The name comes from the [Metonic cycle](https://en.wikipedia.org/wiki/Metonic_cycle),
> the recurring period after which the lunar and solar calendars line up again.

**Status:** early development (v0.1 in progress). Not on the Chrome Web Store yet.

## Why

Existing subscription managers want your bank login, only see a subscription after the
first charge, and are closed source. Metonic takes a different approach:

- **Local-first.** Your data stays in your browser. No account, no server, no bank linking.
- **Catches signups as they happen.** It spots the checkout page, so it knows about
  free trials before they bill you.
- **Community recipes.** How to cancel or pause each service is described in a small
  YAML file anyone can add or fix, much like yt-dlp's site extractors.
- **Bring your own AI, optionally.** Everything works without AI. Plug in Chrome's
  built-in Gemini Nano, a local model through Ollama, or a hosted API to improve
  detection, draft recipes, and handle services that don't have a recipe yet.

## What works today

- Detects subscription checkouts on known services (or every site, if you opt in)
  and asks whether to track them
- "Track this page" on any site, plus manual entry
- Monthly spend per currency
- Notifications before trials end and renewals hit
- "Cancel…" opens the right page with instructions, for services with a recipe

See the [roadmap](docs/roadmap.md) for what's next: guided and automated cancellation,
vacation mode, a recipe recorder, and AI providers.

## Try it (development build)

Requires Node 24+.

```sh
npm install
npm run dev        # opens a browser with the extension loaded and hot reload
```

If your Chrome version refuses to auto-load the extension, use the manual steps below.

Or build and load it manually:

```sh
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and
select `apps/extension/.output/chrome-mv3`.

## Repository layout

```
apps/extension     The Chrome extension (WXT, React, Manifest V3)
packages/core      Subscription model, recipe schema, checkout detection
recipes/services   One YAML recipe per service  ← start here to contribute
docs/              Architecture, recipe spec, research, roadmap
```

## Contributing

The most useful thing you can do is **add or fix a recipe**. It takes about five minutes
and no coding. See [recipes/README.md](recipes/README.md). For code changes, see
[CONTRIBUTING.md](CONTRIBUTING.md).

Design background: [architecture](docs/architecture.md) · [recipe spec](docs/recipe-spec.md) · [research notes](docs/research.md)

## License

[AGPL-3.0](LICENSE). Forks and hosted versions must stay open source, so the community's
recipe work stays with the community.
