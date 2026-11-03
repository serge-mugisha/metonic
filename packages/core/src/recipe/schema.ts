import { z } from 'zod';

/**
 * Recipe format v0. See docs/recipe-spec.md for the human-readable spec.
 *
 * Recipes are declarative data. They are validated here and bundled into the
 * extension package at build time; the extension never fetches recipes remotely
 * (Chrome Web Store policy forbids interpreting remotely fetched commands).
 */

export const RECIPE_SCHEMA_VERSION = 0;

export const ActionLevel = z.enum([
  /** URL + written instructions. Anyone can contribute these. */
  'info',
  /** The extension opens the page and highlights each element, the user clicks. */
  'guided',
  /** The extension performs the steps, pausing at `confirm` steps for user approval. */
  'automated',
]);
export type ActionLevel = z.infer<typeof ActionLevel>;

export const Target = z
  .object({
    /** Visible text or accessible name. Preferred: it survives redesigns better than CSS. */
    text: z.string().min(1).optional(),
    role: z.enum(['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab', 'option', 'textbox']).optional(),
    /** CSS selector fallback when text is ambiguous. */
    selector: z.string().min(1).optional(),
  })
  .strict()
  .refine((t) => t.text !== undefined || t.selector !== undefined, {
    message: 'a target needs `text` or `selector`',
  });
export type Target = z.infer<typeof Target>;

export const Step = z.discriminatedUnion('do', [
  z.object({ do: z.literal('navigate'), url: z.url({ protocol: /^https$/ }), say: z.string().optional() }).strict(),
  z.object({ do: z.literal('click'), target: Target, say: z.string().min(1) }).strict(),
  z.object({ do: z.literal('choose'), target: Target, say: z.string().min(1) }).strict(),
  z.object({ do: z.literal('expect'), text: z.string().min(1), say: z.string().optional() }).strict(),
  /** Stop and ask the user before continuing. Required before any irreversible click. */
  z.object({ do: z.literal('confirm'), say: z.string().min(1) }).strict(),
]);
export type Step = z.infer<typeof Step>;

export const Action = z
  .object({
    level: ActionLevel,
    /** Page where the action starts. */
    url: z.url({ protocol: /^https$/ }),
    /** Plain-language instructions, shown at every level. */
    instructions: z.array(z.string().min(1)).min(1),
    steps: z.array(Step).optional(),
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((action, ctx) => {
    if (action.level === 'info') return;
    const steps = action.steps ?? [];
    if (steps.length === 0) {
      ctx.addIssue({ code: 'custom', message: `level "${action.level}" requires steps`, path: ['steps'] });
      return;
    }
    if (action.level === 'automated') {
      const finalClick = steps.findLastIndex((s) => s.do === 'click' || s.do === 'choose');
      const confirmed = steps.slice(0, finalClick).some((s) => s.do === 'confirm');
      if (finalClick !== -1 && !confirmed) {
        ctx.addIssue({
          code: 'custom',
          message: 'automated actions must have a `confirm` step before the final click',
          path: ['steps'],
        });
      }
    }
  });
export type Action = z.infer<typeof Action>;

export const PauseAvailability = z.enum([
  /** The service offers pause as a normal account option. */
  'native',
  /** Pause is only offered as a save offer inside the cancel flow. */
  'retention-offer',
  'none',
  'unknown',
]);

export const PauseAction = z
  .object({
    availability: PauseAvailability,
    /** ISO 8601 duration, e.g. "P3M". */
    maxDuration: z.iso.duration().optional(),
    autoResumes: z.boolean().optional(),
    action: Action.optional(),
  })
  .strict();

const hostname = z
  .string()
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'bare lowercase hostname, no scheme or path (e.g. "netflix.com")');

export const Recipe = z
  .object({
    schemaVersion: z.literal(RECIPE_SCHEMA_VERSION),
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id'),
    name: z.string().min(1),
    category: z.enum([
      'streaming',
      'music',
      'gaming',
      'news',
      'software',
      'cloud-storage',
      'ai',
      'fitness',
      'food',
      'shopping',
      'education',
      'other',
    ]),
    /** Sites where this service's checkout and account pages live. Subdomains match too. */
    domains: z.array(hostname).min(1),
    homepage: z.url({ protocol: /^https$/ }),
    /** Other channels that can bill this service; users must cancel there instead. */
    thirdPartyBilling: z.array(z.enum(['apple', 'google-play', 'amazon', 'roku', 'carrier', 'other'])).optional(),
    actions: z
      .object({
        cancel: Action.optional(),
        pause: PauseAction.optional(),
        resume: Action.optional(),
        changePlan: Action.optional(),
      })
      .strict(),
    verification: z
      .object({
        status: z.enum(['unverified', 'verified', 'broken']),
        lastVerified: z.iso.date().optional(),
        /** ISO 3166-1 alpha-2 country codes the flow was verified in. */
        regions: z.array(z.string().regex(/^[A-Z]{2}$/)).optional(),
      })
      .strict(),
    maintainers: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((recipe, ctx) => {
    if (recipe.verification.status === 'verified' && !recipe.verification.lastVerified) {
      ctx.addIssue({
        code: 'custom',
        message: 'verified recipes need `lastVerified`',
        path: ['verification', 'lastVerified'],
      });
    }

    // Every URL a recipe opens must stay on its own domains.
    const actions = recipe.actions;
    const named: [string, Action | undefined][] = [
      ['cancel', actions.cancel],
      ['pause.action', actions.pause?.action],
      ['resume', actions.resume],
      ['changePlan', actions.changePlan],
    ];
    for (const [name, action] of named) {
      if (!action) continue;
      const urls: [string, string][] = [[`actions.${name}.url`, action.url]];
      action.steps?.forEach((step, i) => {
        if (step.do === 'navigate') urls.push([`actions.${name}.steps.${i}.url`, step.url]);
      });
      for (const [where, url] of urls) {
        if (!isOnDomains(url, recipe.domains)) {
          ctx.addIssue({ code: 'custom', message: `${url} is not on this recipe's domains`, path: where.split('.') });
        }
      }
    }
  });
export type Recipe = z.infer<typeof Recipe>;

function isOnDomains(url: string, domains: readonly string[]): boolean {
  const host = new URL(url).hostname;
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Chrome match patterns covering every recipe domain and its subdomains (HTTPS only). */
export function recipeMatchPatterns(recipes: readonly Pick<Recipe, 'domains'>[]): string[] {
  const patterns = recipes.flatMap((r) => r.domains.flatMap((d) => [`https://${d}/*`, `https://*.${d}/*`]));
  return [...new Set(patterns)].sort();
}

/** Find the recipe whose domains include `host` (exact match or subdomain). */
export function findRecipeForHost(recipes: readonly Recipe[], host: string): Recipe | undefined {
  const h = host.toLowerCase().replace(/^www\./, '');
  return recipes.find((r) => r.domains.some((d) => h === d || h.endsWith(`.${d}`)));
}
