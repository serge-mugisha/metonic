import type { Recipe } from '@metonic/core';

export const recipes: readonly Recipe[] = __METONIC_RECIPES__;

export function recipeById(id: string | undefined): Recipe | undefined {
  return id ? recipes.find((r) => r.id === id) : undefined;
}
