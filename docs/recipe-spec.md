# Recipe spec (v0)

A **recipe** describes how to manage one service: where its account pages live, how to
cancel, whether it can be paused, and how confident we are that the steps are current.
Recipes are YAML files in [`recipes/services/`](../recipes/services), one per service,
named `<id>.yaml`.

The source of truth is the Zod schema in
[`packages/core/src/recipe/schema.ts`](../packages/core/src/recipe/schema.ts). Run
`npm run recipes:validate` before opening a PR; CI runs it too.

## Example

```yaml
# yaml-language-server: $schema=../schema.json
schemaVersion: 0
id: netflix
name: Netflix
category: streaming
domains:
  - netflix.com
homepage: https://www.netflix.com
thirdPartyBilling: [carrier, other]
actions:
  cancel:
    level: info
    url: https://www.netflix.com/cancelplan
    instructions:
      - Sign in to Netflix in this browser.
      - Open the cancel page (Account > Membership > Cancel membership).
      - Click "Finish cancellation".
  pause:
    availability: unknown
verification:
  status: unverified
```

## Fields

| Field | Required | Notes |
|---|---|---|
| `schemaVersion` | yes | Always `0` for now |
| `id` | yes | kebab-case, matches the file name |
| `name` | yes | Display name |
| `category` | yes | `streaming`, `music`, `gaming`, `news`, `software`, `cloud-storage`, `ai`, `fitness`, `food`, `shopping`, `education`, `other` |
| `domains` | yes | Bare hostnames (`netflix.com`). Subdomains match automatically. A domain can belong to only one recipe |
| `accountDomains` | no | Shared account portals where the service is managed but not sold, e.g. `microsoft.com` for both Microsoft 365 and Xbox Game Pass. Action URLs may use them; several recipes can list the same one; never used for detection |
| `detectOn` | no | Path prefixes where signups happen, e.g. `[/prime]` on amazon.com. When set, checkout detection only runs on those paths. Use it for big sites that also sell one-off things |
| `homepage` | yes | `https` URL |
| `thirdPartyBilling` | no | Channels that may bill this service instead: `apple`, `google-play`, `amazon`, `roku`, `carrier`, `other`. The UI tells users to cancel there |
| `actions.cancel` / `resume` / `changePlan` | no | An [action](#actions) |
| `actions.pause` | no | See [pause](#pause) |
| `verification` | yes | See [verification](#verification) |
| `maintainers` | no | GitHub handles willing to keep this recipe current |

## Actions

```yaml
cancel:
  level: info | guided | automated
  url: https://...          # where the flow starts
  instructions: [ ... ]     # always required; shown at every level
  steps: [ ... ]            # required for guided and automated
  notes: ...                # optional caveats
```

### Levels

| Level | What Metonic does | Who can write it |
|---|---|---|
| `info` | Opens `url`, shows `instructions` | Anyone |
| `guided` | Opens `url`, highlights each step's target; the user clicks | Anyone with the recorder (v0.2) |
| `automated` | Performs the steps, stopping at every `confirm` | Contributors who can test the flow end to end |

### Steps

| Step | Fields | Meaning |
|---|---|---|
| `navigate` | `url`, `say?` | Go to an `https` URL on the recipe's domains |
| `click` | `target`, `say` | Click an element |
| `choose` | `target`, `say` | Pick an option (radio, select option, menu item) |
| `expect` | `text`, `say?` | Wait until this text is visible; fail the recipe if it never appears |
| `confirm` | `say` | Stop and ask the user. **Required before the final click of an `automated` action** |

A `target` needs `text` and/or `selector`:

```yaml
target:
  text: Finish cancellation   # visible text or accessible name (preferred)
  role: button                # optional: button, link, checkbox, radio, menuitem, tab, option, textbox
  selector: '[data-uia="action-finish-cancellation"]'  # optional CSS fallback
```

Prefer `text` + `role`: they survive redesigns better than CSS classes. Use `selector`
only for stable attributes (`data-*`, `id`, `aria-*`), never generated class names.

### Automated example

```yaml
cancel:
  level: automated
  url: https://www.example.com/account
  instructions:
    - Open Account, click "Cancel membership", then confirm.
  steps:
    - do: click
      target: { text: Cancel membership, role: link }
      say: Open the cancellation page.
    - do: expect
      text: Are you sure
    - do: confirm
      say: Cancel your Example membership now? You keep access until the end of the billing period.
    - do: click
      target: { text: Finish cancellation, role: button }
      say: Finish cancelling.
    - do: expect
      text: Your membership has been cancelled
```

## Pause

```yaml
pause:
  availability: native | retention-offer | none | unknown
  maxDuration: P3M      # optional ISO 8601 duration
  autoResumes: true     # optional
  action: { ... }       # optional action, same shape as cancel
```

- `native`: pause is a normal account option.
- `retention-offer`: pause only shows up inside the cancel flow.
- `none`: no pause; vacation mode will cancel at period end and remind you to resubscribe.

## Verification

```yaml
verification:
  status: unverified | verified | broken
  lastVerified: 2026-11-03   # required in practice when status is verified
  regions: [US, GB]          # ISO country codes the flow was checked in
```

Only mark a recipe `verified` after following it yourself. Flows differ by country and
plan, so list the regions you checked. If a flow stops working, set `broken` and open
an issue; the extension will warn users and fall back to `instructions`.

## Safety rules

- `https` only, and every `navigate` must stay on the recipe's `domains`.
- No scripts, no `eval`, no arbitrary JavaScript: recipes are data that the extension interprets.
- Unknown keys fail validation, so typos surface in review.
- Recipes ship inside the extension; they're never downloaded at runtime.
- Every recipe PR is reviewed like code.
