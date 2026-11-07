import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, type Subscription, toIsoDate } from '@metonic/core';
import type { Page } from 'puppeteer-core';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { type Harness, launch, waitFor } from './harness';

/**
 * Chrome Web Store screenshots (1280x800), written to docs/store/.
 * Opt-in: STORE_SCREENSHOTS=1 npm run e2e
 */
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs', 'store');
const SIZE = { width: 1280, height: 800 };

const day = (offset: number) => addDays(toIsoDate(new Date()), offset);
const base = { source: 'detected', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' } as const;
const SAMPLE: Subscription[] = [
  {
    ...base,
    id: '1',
    serviceId: 'netflix',
    name: 'Netflix',
    status: 'active',
    cycle: 'monthly',
    price: { amountMinor: 1799, currency: 'USD' },
    billingAnchorOn: day(4),
  },
  {
    ...base,
    id: '2',
    serviceId: 'spotify',
    name: 'Spotify Premium',
    status: 'active',
    cycle: 'monthly',
    price: { amountMinor: 1199, currency: 'USD' },
    billingAnchorOn: day(12),
  },
  {
    ...base,
    id: '3',
    serviceId: 'youtube-premium',
    name: 'YouTube Premium',
    status: 'trial',
    cycle: 'monthly',
    price: { amountMinor: 1399, currency: 'USD' },
    trialEndsOn: day(2),
  },
  {
    ...base,
    id: '4',
    serviceId: 'claude-pro',
    name: 'Claude Pro',
    status: 'active',
    cycle: 'monthly',
    price: { amountMinor: 2000, currency: 'USD' },
    billingAnchorOn: day(20),
  },
  {
    ...base,
    id: '5',
    serviceId: 'duolingo',
    name: 'Duolingo Super',
    status: 'active',
    cycle: 'yearly',
    price: { amountMinor: 8499, currency: 'USD' },
    billingAnchorOn: day(140),
  },
  {
    ...base,
    id: '6',
    serviceId: 'dropbox',
    name: 'Dropbox',
    status: 'active',
    cycle: 'monthly',
    price: { amountMinor: 1199, currency: 'USD' },
    billingAnchorOn: day(26),
  },
  {
    ...base,
    id: '7',
    serviceId: 'new-york-times',
    name: 'The New York Times',
    status: 'cancelled',
    cycle: 'monthly',
    price: { amountMinor: 2500, currency: 'USD' },
  },
];

const CHECKOUT_HTML = `<!doctype html><html lang="en-US"><head><title>Choose how to pay</title>
<style>body{margin:0;font:16px system-ui;background:#f6f6f4;color:#222}main{max-width:520px;margin:90px auto;background:#fff;padding:36px;border-radius:12px;box-shadow:0 2px 12px #0001}
h1{font-size:26px;margin:0 0 6px}.plan{border:1px solid #ddd;border-radius:8px;padding:14px;margin:18px 0}input{display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0;border:1px solid #ccc;border-radius:6px;font:inherit}
button{width:100%;padding:14px;border:0;border-radius:6px;background:#222;color:#fff;font:600 16px system-ui;margin-top:10px}small{color:#666}</style></head>
<body><main><small>STEP 3 OF 3</small><h1>Set up your credit or debit card</h1>
<div class="plan"><b>Standard</b> &nbsp; $17.99/month</div>
<input autocomplete="cc-number" placeholder="Card number"><input placeholder="Expiration date"><input placeholder="CVV">
<small>Your membership renews automatically. Cancel anytime.</small><button>Start Membership</button></main></body></html>`;

async function caption(h: Harness, name: string, title: string, shot: Buffer, shotWidth: number) {
  const page = await h.browser.newPage();
  await page.setViewport(SIZE);
  await page.setContent(`<html><body style="margin:0;height:800px;display:flex;align-items:center;justify-content:center;gap:64px;
    background:linear-gradient(135deg,#eef0ff,#f8f7ff);font:600 40px/1.25 system-ui;color:#1e1b4b">
    <div style="max-width:420px">${title}</div>
    <img src="data:image/png;base64,${shot.toString('base64')}" width="${shotWidth}" style="border-radius:12px;box-shadow:0 20px 50px #312e8133">
    </body></html>`);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await page.close();
}

const shoot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

/** Listing screenshots use the light theme; headless Chrome defaults to dark. */
async function light(page: Page) {
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  return page;
}

describe.skipIf(!process.env.STORE_SCREENSHOTS)('store screenshots', () => {
  let h: Harness;
  beforeAll(async () => {
    mkdirSync(OUT, { recursive: true });
    h = await launch();
  });
  afterAll(async () => {
    await h?.close();
  });

  it('captures the listing screenshots', async () => {
    await h.clearStorage();

    // 1. In-page prompt on a checkout.
    const checkout = await light(await h.openFakeSite('https://www.netflix.com/signup/payment', CHECKOUT_HTML));
    await checkout.setViewport(SIZE);
    await checkout.waitForSelector('metonic-prompt >>> .title', { timeout: 10_000 });
    await shoot(checkout, '1-prompt');
    await checkout.close();

    // 2. Popup with subscriptions, framed with a caption.
    await h.worker.evaluate((subs) => chrome.storage.local.set({ subscriptions: subs, pendingDetections: [] }), SAMPLE);
    const popup = await light(await h.openExtensionPage('popup.html', { width: 380, height: 600 }));
    await waitFor(async () => (await popup.$$('.row')).length >= 5 || undefined);
    const height = await popup.evaluate(() => document.querySelector('main')?.getBoundingClientRect().height ?? 600);
    await popup.setViewport({ width: 380, height: Math.ceil(height) });
    const popupShot = Buffer.from(await popup.screenshot());
    await popup.close();
    await caption(h, '2-popup', 'Every subscription in one place, with reminders before you pay.', popupShot, 380);

    // 3. Overview.
    const overview = await light(await h.openExtensionPage('dashboard.html', SIZE));
    await overview.reload({ waitUntil: 'networkidle0' });
    await shoot(overview, '3-overview');
    await overview.close();

    // 4. Welcome / privacy.
    const welcome = await light(await h.openExtensionPage('welcome.html', SIZE));
    await shoot(welcome, '4-welcome');
    await welcome.close();
  });
});
