import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, computeExecutablePath, detectBrowserPlatform, install, resolveBuildId } from '@puppeteer/browsers';

const here = path.dirname(fileURLToPath(import.meta.url));
export const EXTENSION_DIR = path.resolve(here, '..', '.output', 'chrome-mv3');
const CACHE_DIR = path.resolve(here, '..', '.cache', 'chrome');

/**
 * Chrome for Testing, downloaded on first use. Branded Chrome no longer loads unpacked
 * extensions from the command line, so tests need this build.
 * Set CHROME_PATH to use an existing binary, or CHROME_BUILD to pin a version.
 */
export async function chromeExecutable(): Promise<string> {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const platform = detectBrowserPlatform();
  if (!platform) throw new Error('Unsupported platform for Chrome for Testing');
  const buildId = process.env.CHROME_BUILD ?? (await resolveBuildId(Browser.CHROME, platform, 'stable'));
  const executablePath = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir: CACHE_DIR });
  if (!existsSync(executablePath)) {
    console.log(`Downloading Chrome for Testing ${buildId}...`);
    await install({ browser: Browser.CHROME, buildId, cacheDir: CACHE_DIR });
  }
  return executablePath;
}
