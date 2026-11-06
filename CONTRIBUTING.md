# Contributing to Metonic

Thanks for helping. There are two kinds of contribution:

## 1. Recipes (no coding needed)

Recipes teach Metonic how to manage a service. See [recipes/README.md](recipes/README.md)
and the [recipe spec](docs/recipe-spec.md). Good first contributions:

- Add an `info` recipe for a service you use
- Verify an `unverified` recipe and record the date and country you checked
- Fix a recipe whose flow changed

Please only mark a recipe `verified` if you followed the steps yourself. You don't need
to actually cancel: stop at the final confirmation screen.

## 2. Code

```sh
npm install
npm run dev          # extension with hot reload
npm test             # unit tests (Vitest)
npm run typecheck
npm run lint         # Biome; `npm run format` fixes formatting and import order
npm run recipes:validate
npm run build
npm run e2e          # builds the e2e variant and runs browser tests (downloads Chrome for Testing once)
```

Guidelines:

- **Read [docs/architecture.md](docs/architecture.md) first.** The principles there
  (local-first, useful without AI, least privilege, no required fees) decide most
  design questions.
- Keep `packages/core` browser-safe and free of extension APIs so it stays testable.
- New permissions need a justification in the PR description. Broad host access is
  always opt-in.
- Detection changes must keep every fixture in `packages/core/src/detect/fixtures` passing. Add a
  fixture for the case you fixed (see the [capture guide](packages/core/src/detect/fixtures/README.md)).
- Never add code that downloads and runs logic or recipes at runtime (Chrome Web Store
  policy and our security model).

## Pull requests

- One topic per PR. Link the issue it closes.
- CI must pass: lint, tests, typecheck, recipe validation, build, browser smoke test.
- By contributing you agree your contribution is licensed under AGPL-3.0.

## Security issues

Don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).
