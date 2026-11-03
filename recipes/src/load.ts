import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Recipe } from '@metonic/core';
import { parse } from 'yaml';

export const SERVICES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'services');

export interface RecipeProblem {
  file: string;
  messages: string[];
}

export interface LoadResult {
  recipes: Recipe[];
  problems: RecipeProblem[];
}

/**
 * Load and validate every `*.yaml` recipe in `dir`. Synchronous on purpose: the
 * extension's build config calls it to inline recipes into the package.
 */
export function loadRecipes(dir: string = SERVICES_DIR): LoadResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const recipes: Recipe[] = [];
  const problems: RecipeProblem[] = [];

  for (const file of files) {
    const raw = readFileSync(path.join(dir, file), 'utf8');
    let data: unknown;
    try {
      data = parse(raw);
    } catch (err) {
      problems.push({ file, messages: [`invalid YAML: ${(err as Error).message}`] });
      continue;
    }

    const result = Recipe.safeParse(data);
    if (!result.success) {
      problems.push({
        file,
        messages: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      });
      continue;
    }

    const expectedFile = `${result.data.id}.yaml`;
    if (file !== expectedFile) {
      problems.push({ file, messages: [`file name must match id: expected ${expectedFile}`] });
      continue;
    }
    recipes.push(result.data);
  }

  problems.push(...findDomainConflicts(recipes));
  return { recipes, problems };
}

/** Like `loadRecipes`, but throws a readable error if any recipe is invalid. */
export function loadRecipesOrThrow(dir: string = SERVICES_DIR): Recipe[] {
  const { recipes, problems } = loadRecipes(dir);
  if (problems.length > 0) {
    const detail = problems.map((p) => `  ${p.file}\n${p.messages.map((m) => `    ${m}`).join('\n')}`).join('\n');
    throw new Error(`Invalid recipes (run \`npm run recipes:validate\`):\n${detail}`);
  }
  return recipes;
}

function findDomainConflicts(recipes: Recipe[]): RecipeProblem[] {
  const owner = new Map<string, string>();
  const problems: RecipeProblem[] = [];
  for (const r of recipes) {
    for (const d of r.domains) {
      const other = owner.get(d);
      if (other) problems.push({ file: `${r.id}.yaml`, messages: [`domain ${d} is already claimed by ${other}`] });
      else owner.set(d, r.id);
    }
  }
  return problems;
}
