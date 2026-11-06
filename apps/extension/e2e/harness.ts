import puppeteer, { type Browser, type Page, type WebWorker } from 'puppeteer-core';
import { inject } from 'vitest';
import { EXTENSION_DIR } from './chrome';

export interface Harness {
  browser: Browser;
  extensionId: string;
  /** The extension's service worker, for reading storage and badge state. */
  worker: WebWorker;
  /** Open `url` in a tab where every request to its origin is answered with `html`; nothing hits the network. */
  openFakeSite(url: string, html: string): Promise<Page>;
  openExtensionPage(file: 'popup.html' | 'options.html', viewport?: { width: number; height: number }): Promise<Page>;
  storage<T = Record<string, unknown>>(keys?: string[]): Promise<T>;
  clearStorage(): Promise<void>;
  badge(): Promise<string>;
  /** Uncaught errors from extension pages opened through the harness. */
  pageErrors: string[];
  close(): Promise<void>;
}

export async function launch(): Promise<Harness> {
  const executablePath = inject('chromePath');

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    pipe: true,
    enableExtensions: [EXTENSION_DIR],
    // GitHub's Ubuntu runners block Chrome's user-namespace sandbox.
    args: ['--no-first-run', ...(process.env.CI ? ['--no-sandbox'] : [])],
  });

  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'),
    { timeout: 15_000 },
  );
  const worker = await target.worker();
  if (!worker) throw new Error('Could not attach to the extension service worker');
  const extensionId = new URL(target.url()).host;
  const pageErrors: string[] = [];

  return {
    browser,
    extensionId,
    worker,
    pageErrors,
    async openFakeSite(url, html) {
      const page = await browser.newPage();
      const origin = new URL(url).origin;
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().startsWith(origin)) void req.respond({ status: 200, contentType: 'text/html', body: html });
        else void req.abort();
      });
      await page.goto(url, { waitUntil: 'load' });
      return page;
    },
    async openExtensionPage(file, viewport = { width: 380, height: 520 }) {
      const page = await browser.newPage();
      page.on('pageerror', (e) => pageErrors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`));
      await page.setViewport(viewport);
      await page.goto(`chrome-extension://${extensionId}/${file}`, { waitUntil: 'networkidle0' });
      return page;
    },
    storage: (keys) => worker.evaluate((k) => chrome.storage.local.get(k ?? null), keys) as never,
    clearStorage: () => worker.evaluate(() => chrome.storage.local.clear()),
    badge: () => worker.evaluate(() => chrome.action.getBadgeText({})),
    close: () => browser.close(),
  };
}

/** Poll until `check` returns a truthy value or the timeout passes. */
export async function waitFor<T>(
  check: () => Promise<T | undefined | null | false | ''>,
  { timeout = 10_000, interval = 200 } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, interval));
  }
}
