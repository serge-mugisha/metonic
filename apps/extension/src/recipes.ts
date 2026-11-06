import type { Category, Recipe, Subscription } from '@metonic/core';

export const recipes: readonly Recipe[] = __METONIC_RECIPES__;

export function recipeById(id: string | undefined): Recipe | undefined {
  return id ? recipes.find((r) => r.id === id) : undefined;
}

/** The category a subscription is shown under: the user's choice, else its service's, else "other". */
export function categoryOf(sub: Pick<Subscription, 'category' | 'serviceId'>): Category {
  return sub.category ?? recipeById(sub.serviceId)?.category ?? 'other';
}
