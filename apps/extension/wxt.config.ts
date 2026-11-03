import { recipeMatchPatterns } from '@metonic/core';
import { loadRecipesOrThrow } from '@metonic/recipes/load';
import { defineConfig } from 'wxt';

// Recipes are validated and inlined at build time. The extension never downloads
// recipes: Chrome Web Store policy forbids interpreting remotely fetched commands.
const recipes = loadRecipesOrThrow();

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Metonic',
    description:
      'Track every subscription, get warned before free trials convert, and cancel or pause with community recipes.',
    permissions: ['storage', 'alarms', 'notifications', 'scripting', 'activeTab'],
    // Checkout detection runs on known services by default...
    host_permissions: recipeMatchPatterns(recipes),
    // ...and on every site only if the user opts in from settings.
    optional_host_permissions: ['<all_urls>'],
    action: { default_title: 'Metonic' },
  },
  vite: () => ({
    define: {
      __METONIC_RECIPES__: JSON.stringify(recipes),
    },
  }),
});
