import 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Chrome for Testing binary, provided by e2e/setup.ts. */
    chromePath: string;
  }
}

declare global {
  /** Code passed to `worker.evaluate` runs in the extension's service worker, where `chrome` exists. */
  const chrome: typeof browser;
}
