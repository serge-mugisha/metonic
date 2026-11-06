import { defineConfig } from 'vitest/config';

// Browser smoke tests against the built extension. Run with `npm run e2e` after `npm run build`.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['**/*.e2e.ts'],
    globalSetup: ['./setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
