# Recipes

Each file in [`services/`](services) teaches Metonic how to manage one service. Adding
or fixing a recipe is the most valuable contribution you can make, and the simplest
kind (`level: info`) needs no coding at all.

## Add a recipe in five minutes

1. Copy [`services/netflix.yaml`](services/netflix.yaml) to `services/<your-service-id>.yaml`.
2. Fill in the domains, the cancel page URL and the instructions.
3. Leave `verification.status: unverified` unless you followed the steps yourself
   just now. If you did, set `verified`, `lastVerified` and the `regions` you checked.
4. Run `npm run recipes:validate`.
5. Open a pull request.

Your editor will autocomplete fields if it supports the `yaml-language-server` comment
at the top of each file (VS Code with the YAML extension does).

The full format is in [docs/recipe-spec.md](../docs/recipe-spec.md).

## Fixing a broken recipe

Cancel flows change constantly. If a recipe no longer works, either fix it and open a
PR, or open a **Recipe broken** issue saying what you saw instead and in which country.
