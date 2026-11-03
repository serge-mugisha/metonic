# Security policy

Metonic runs on pages where you are signed in and handling payments, so we take security
reports seriously.

## Reporting a vulnerability

Please report privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(the **Report a vulnerability** button on the repository's Security tab). Don't open
a public issue.

We aim to acknowledge reports within 72 hours.

## What we consider in scope

- Anything that lets a web page read or change Metonic data, or trigger actions
- Recipes that can act outside their declared domains, or skip a `confirm` step
- Ways to get the extension to run code that isn't in the reviewed package
- Prompt-injection paths through which page content can steer an AI action (once AI features ship)
- Leaks of subscription data off the device

## Design commitments

- No remote code and no remote recipes: everything that runs is in the reviewed package.
- Recipes are declarative data, limited to their own domains, with a mandatory
  confirmation before irreversible clicks.
- Broad host access is opt-in.
- No telemetry by default.
