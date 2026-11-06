import { existsSync } from 'node:fs';
import path from 'node:path';
import type { TestProject } from 'vitest/node';
import { chromeExecutable, EXTENSION_DIR } from './chrome';

/** Vitest global setup: make sure there is a build to test and a browser to run it in. */
export default async function setup(project: TestProject) {
  if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json'))) {
    throw new Error(`No extension build at ${EXTENSION_DIR}. Run \`npm run build:e2e -w apps/extension\` first.`);
  }
  project.provide('chromePath', await chromeExecutable());
}
