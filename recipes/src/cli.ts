import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { Recipe } from '@metonic/core';
import { z } from 'zod';
import { loadRecipes, SERVICES_DIR } from './load';

const checkOnly = process.argv.includes('--check');

const { recipes, problems } = loadRecipes();

if (problems.length > 0) {
  for (const p of problems) {
    console.error(`✗ recipes/services/${p.file}`);
    for (const m of p.messages) console.error(`    ${m}`);
  }
  console.error(`\n${problems.length} recipe file(s) have problems.`);
  process.exit(1);
}

console.log(`✓ ${recipes.length} recipe(s) valid`);

if (!checkOnly) {
  // JSON Schema for editor autocomplete in recipe files. Cross-field rules (e.g. confirm
  // before the final click) only exist in the Zod schema, so this is a convenience, not the validator.
  const schema = z.toJSONSchema(Recipe, { io: 'input', unrepresentable: 'any' });
  const out = path.join(SERVICES_DIR, '..', 'schema.json');
  writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`  wrote ${path.relative(process.cwd(), out)}`);
}
