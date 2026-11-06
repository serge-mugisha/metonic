import { recipeMatchPatterns } from '@metonic/core';
import { loadRecipesOrThrow } from '@metonic/recipes/load';
import { defineConfig } from 'wxt';

// Recipes are validated and inlined at build time. The extension never downloads
// recipes: Chrome Web Store policy forbids interpreting remotely fetched commands.
const recipes = loadRecipesOrThrow();

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ mode }) => ({
    name: 'Metonic',
    description:
      'Track every subscription, get warned before free trials convert, and cancel or pause with community recipes.',
    permissions: ['storage', 'alarms', 'notifications', 'scripting', 'activeTab'],
    // No required host permissions. Site access (known services, or every site) is requested
    // at runtime, so adding recipes in an update never triggers Chrome's "disable until the
    // user accepts new permissions" behavior. See docs/architecture.md.
    optional_host_permissions: ['<all_urls>'],
    // Browser tests can't click Chrome's permission dialog, so the e2e build (`--mode e2e`,
    // written to .output/chrome-mv3-e2e) starts with the known services already granted.
    ...(mode === 'e2e' && { host_permissions: recipeMatchPatterns(recipes) }),
    action: { default_title: 'Metonic' },
  }),
  zip: {
    artifactTemplate: 'metonic-{{packageVersion}}-{{browser}}.zip',
  },
  vite: () => ({
    define: {
      __METONIC_RECIPES__: JSON.stringify(recipes),
    },
  }),
});
