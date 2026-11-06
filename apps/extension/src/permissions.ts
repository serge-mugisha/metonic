import { type Recipe, recipeDetectPatterns, recipeMatchPatterns } from '@metonic/core';
import { recipes } from './recipes';

export const ALL_SITES = '<all_urls>';

/** Match patterns for every known service (`https://netflix.com/*`, `https://*.netflix.com/*`, ...). */
export const RECIPE_ORIGINS = recipeMatchPatterns(recipes);

export interface DetectionAccess {
  /** The user allowed detection on every site. */
  universal: boolean;
  /** Known services the extension has access to. */
  granted: readonly Recipe[];
  /** Number of known services the detector can't see yet. */
  missingServices: number;
}

export async function detectionAccess(): Promise<DetectionAccess> {
  const universal = await browser.permissions.contains({ origins: [ALL_SITES] });
  if (universal) return { universal, granted: recipes, missingServices: 0 };

  // Ask per service rather than comparing pattern strings: Chrome may normalize what it stores.
  const perService = await Promise.all(
    recipes.map(async (recipe) => {
      return { recipe, ok: await browser.permissions.contains({ origins: recipeMatchPatterns([recipe]) }) };
    }),
  );
  return {
    universal,
    granted: perService.filter((s) => s.ok).map((s) => s.recipe),
    missingServices: perService.filter((s) => !s.ok).length,
  };
}

/** Where to register the checkout detector: every site, or the signup pages of granted services. */
export function detectorMatches({ universal, granted }: DetectionAccess): string[] {
  return universal ? [ALL_SITES] : recipeDetectPatterns(granted);
}

/** Ask for the known services. Must be called from a click handler: Chrome needs a user gesture. */
export function requestRecipeSites(): Promise<boolean> {
  return browser.permissions.request({ origins: RECIPE_ORIGINS });
}

/** Ask for every site. Must be called from a click handler. */
export function requestAllSites(): Promise<boolean> {
  return browser.permissions.request({ origins: [ALL_SITES] });
}

export function removeAllSites(): Promise<boolean> {
  return browser.permissions.remove({ origins: [ALL_SITES] });
}
