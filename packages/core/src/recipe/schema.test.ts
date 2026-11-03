import { describe, expect, it } from 'vitest';
import { findRecipeForHost, Recipe } from './schema';

const base = {
  schemaVersion: 0,
  id: 'example-tv',
  name: 'Example TV',
  category: 'streaming',
  domains: ['example.com'],
  homepage: 'https://example.com',
  actions: {
    cancel: {
      level: 'info',
      url: 'https://example.com/account/cancel',
      instructions: ['Open the cancel page.', 'Click "Cancel membership".'],
    },
  },
  verification: { status: 'unverified' },
};

describe('Recipe schema', () => {
  it('accepts a minimal info recipe', () => {
    expect(Recipe.safeParse(base).success).toBe(true);
  });

  it('rejects hostnames with a scheme', () => {
    const r = Recipe.safeParse({ ...base, domains: ['https://example.com'] });
    expect(r.success).toBe(false);
  });

  it('requires steps above the info level', () => {
    const r = Recipe.safeParse({
      ...base,
      actions: { cancel: { ...base.actions.cancel, level: 'guided' } },
    });
    expect(r.success).toBe(false);
  });

  it('requires a confirm before the final click in automated recipes', () => {
    const click = { do: 'click', target: { text: 'Finish cancellation', role: 'button' }, say: 'Finish.' };
    const withoutConfirm = {
      ...base,
      actions: { cancel: { ...base.actions.cancel, level: 'automated', steps: [click] } },
    };
    expect(Recipe.safeParse(withoutConfirm).success).toBe(false);

    const withConfirm = {
      ...base,
      actions: {
        cancel: {
          ...base.actions.cancel,
          level: 'automated',
          steps: [{ do: 'confirm', say: 'Cancel Example TV now?' }, click],
        },
      },
    };
    expect(Recipe.safeParse(withConfirm).success).toBe(true);
  });

  it('rejects URLs outside the recipe domains', () => {
    const offsite = { ...base, actions: { cancel: { ...base.actions.cancel, url: 'https://evil.io/cancel' } } };
    expect(Recipe.safeParse(offsite).success).toBe(false);

    const offsiteStep = {
      ...base,
      actions: {
        cancel: {
          ...base.actions.cancel,
          level: 'guided',
          steps: [{ do: 'navigate', url: 'https://example.com.evil.io/' }],
        },
      },
    };
    expect(Recipe.safeParse(offsiteStep).success).toBe(false);
  });

  it('requires lastVerified for verified recipes', () => {
    expect(Recipe.safeParse({ ...base, verification: { status: 'verified' } }).success).toBe(false);
    expect(
      Recipe.safeParse({ ...base, verification: { status: 'verified', lastVerified: '2026-11-03', regions: ['US'] } })
        .success,
    ).toBe(true);
  });

  it('rejects unknown keys so typos surface in review', () => {
    expect(Recipe.safeParse({ ...base, domian: ['x.com'] }).success).toBe(false);
  });
});

describe('findRecipeForHost', () => {
  const recipes = [Recipe.parse(base)];

  it('matches exact hosts, www and subdomains', () => {
    expect(findRecipeForHost(recipes, 'example.com')?.id).toBe('example-tv');
    expect(findRecipeForHost(recipes, 'www.example.com')?.id).toBe('example-tv');
    expect(findRecipeForHost(recipes, 'account.example.com')?.id).toBe('example-tv');
  });

  it('does not match lookalike domains', () => {
    expect(findRecipeForHost(recipes, 'notexample.com')).toBeUndefined();
    expect(findRecipeForHost(recipes, 'example.com.evil.io')).toBeUndefined();
  });
});
