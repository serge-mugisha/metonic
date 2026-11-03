import { describe, expect, it } from 'vitest';
import { loadRecipes } from './load';

describe('bundled recipes', () => {
  it('are all valid', () => {
    const { recipes, problems } = loadRecipes();
    expect(problems).toEqual([]);
    expect(recipes.length).toBeGreaterThan(0);
  });
});
