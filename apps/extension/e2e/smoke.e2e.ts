import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { addCycle, type Subscription, toIsoDate } from '@metonic/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PendingDetection } from '../src/storage';
import { EXTENSION_DIR } from './chrome';
import { type Harness, launch, waitFor } from './harness';

// netflix.com is a recipe domain, so the detector runs there without the all-sites opt-in.
// Requests never reach Netflix: the harness answers them with this page.
const CHECKOUT_URL = 'https://www.netflix.com/signup/payment';
const CHECKOUT_HTML = `<!doctype html><html lang="en-US"><head><title>Set up your credit or debit card</title></head>
<body><h1>Set up your credit or debit card</h1>
<p>Standard plan: $17.99/month. Your membership renews automatically. Cancel anytime.</p>
<input autocomplete="cc-number" placeholder="Card number">
<button>Start Membership</button></body></html>`;
const PRICING_HTML = `<!doctype html><html lang="en-US"><head><title>Plans</title></head>
<body><p>Standard $17.99/month. Premium $24.99/month. Choose a plan.</p></body></html>`;

let h: Harness;

beforeAll(async () => {
  h = await launch();
});

afterAll(async () => {
  await h?.close();
});

beforeEach(async () => {
  await h.clearStorage();
});

const pending = async () => (await h.storage<{ pendingDetections?: PendingDetection[] }>()).pendingDetections ?? [];

describe('extension smoke test', () => {
  it('opens the welcome page on install', async () => {
    const welcome = await waitFor(async () => (await h.browser.pages()).find((p) => p.url().endsWith('/welcome.html')));
    await welcome.waitForSelector('.ok');
    // The e2e build starts with known services granted, so the page reports detection as on.
    expect(await welcome.$eval('.ok', (el) => el.textContent)).toMatch(/Checkout detection is on/);
    await welcome.close();
  });

  const productionManifest = path.resolve(EXTENSION_DIR, '..', 'chrome-mv3', 'manifest.json');
  it.skipIf(!existsSync(productionManifest))('ships no required host permissions in the production build', () => {
    // Adding host permissions in an update disables the extension until users accept them. See #41.
    const manifest = JSON.parse(readFileSync(productionManifest, 'utf8'));
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.optional_host_permissions).toEqual(['<all_urls>']);
  });

  it('registers the checkout detector on recipe domains', async () => {
    const scripts = await waitFor(async () => {
      const registered = await h.worker.evaluate(() => chrome.scripting.getRegisteredContentScripts());
      return registered.length > 0 ? registered : undefined;
    });
    expect(scripts[0]?.id).toBe('metonic-checkout-detector');
    expect(scripts[0]?.matches).toContain('https://*.netflix.com/*');
  });

  it('detects a checkout, badges it, and tracks it from the popup', async () => {
    const page = await h.openFakeSite(CHECKOUT_URL, CHECKOUT_HTML);
    const [entry] = await waitFor(async () => {
      const list = await pending();
      return list.length > 0 ? list : undefined;
    });
    await page.close();

    expect(entry).toMatchObject({
      key: 'netflix',
      serviceId: 'netflix',
      detection: {
        isLikelyCheckout: true,
        recurring: { price: { amountMinor: 1799, currency: 'USD' }, cycle: 'monthly' },
      },
    });
    expect(await waitFor(async () => ((await h.badge()) === '1' ? '1' : undefined))).toBe('1');

    const popup = await h.openExtensionPage('popup.html');
    const [track] = await popup.$$('xpath/.//button[normalize-space()="Track"]');
    expect(track, 'Track button').toBeDefined();
    await track?.click();

    const [sub] = await waitFor(async () => {
      const subs = (await h.storage<{ subscriptions?: Subscription[] }>()).subscriptions ?? [];
      return subs.length > 0 ? subs : undefined;
    });
    const today = toIsoDate(new Date());
    expect(sub).toMatchObject({
      serviceId: 'netflix',
      name: 'Netflix',
      status: 'active',
      price: { amountMinor: 1799, currency: 'USD' },
      startedOn: today,
      // Paid today, so the next charge is a cycle away, not today.
      billingAnchorOn: addCycle(today, 'monthly'),
    });
    expect(await pending()).toEqual([]);
    expect(await waitFor(async () => ((await h.badge()) === '' ? 'cleared' : undefined))).toBe('cleared');
    await popup.close();
  });

  it('shows an in-page prompt that tracks the subscription', async () => {
    const page = await h.openFakeSite(CHECKOUT_URL, CHECKOUT_HTML);
    const title = await page.waitForSelector('metonic-prompt >>> .title', { timeout: 10_000 });
    expect(await title?.evaluate((el) => el.textContent)).toBe('Subscribing to Netflix?');
    expect(await page.$eval('metonic-prompt >>> .details', (el) => el.textContent)).toMatch(/\$17\.99\/month$/); // "$" or "US$" depending on browser locale

    // Synthetic clicks from page scripts must be ignored.
    await page.evaluate(() =>
      (
        document.querySelector('metonic-prompt')?.shadowRoot?.querySelector('button:not(.close)') as HTMLElement
      )?.click(),
    );
    await new Promise((r) => setTimeout(r, 500));
    expect((await h.storage<{ subscriptions?: Subscription[] }>()).subscriptions ?? []).toEqual([]);

    await page.click('metonic-prompt >>> button:not(.close):not(.secondary)');
    await page.waitForFunction(
      () =>
        document.querySelector('metonic-prompt')?.shadowRoot?.querySelector('.title')?.textContent ===
        'Tracking Netflix',
    );
    const subs = (await h.storage<{ subscriptions?: Subscription[] }>()).subscriptions ?? [];
    expect(subs.map((s) => s.serviceId)).toEqual(['netflix']);
    expect(await pending()).toEqual([]);
    await page.close();
  });

  it('does not ask again after "Not now"', async () => {
    const first = await h.openFakeSite(CHECKOUT_URL, CHECKOUT_HTML);
    await first.waitForSelector('metonic-prompt >>> button.secondary', { timeout: 10_000 });
    await first.click('metonic-prompt >>> button.secondary');
    await waitFor(async () => (await h.storage<{ dismissedDetections?: object }>()).dismissedDetections);
    expect(await first.$('metonic-prompt')).toBeNull();
    await first.close();

    const again = await h.openFakeSite(CHECKOUT_URL, CHECKOUT_HTML);
    await new Promise((r) => setTimeout(r, 2500));
    expect(await again.$('metonic-prompt')).toBeNull();
    expect(await pending()).toEqual([]);
    await again.close();
  });

  it('skips the page prompt when the user prefers notifications', async () => {
    await h.worker.evaluate(() => chrome.storage.local.set({ settings: { prompt: 'notification' } }));
    const page = await h.openFakeSite(CHECKOUT_URL, CHECKOUT_HTML);
    await waitFor(async () => ((await pending()).length > 0 ? true : undefined));
    await new Promise((r) => setTimeout(r, 500));
    expect(await page.$('metonic-prompt')).toBeNull();
    await page.close();
  });

  it('only detects on signup pages for recipes with detectOn (Amazon Prime)', async () => {
    const upsell = `<!doctype html><html lang="en-US"><head><title>Place Your Order - Checkout</title></head><body>
<p>USB-C cable $12.99. Order total: $14.06</p>
<p>Try Prime FREE for 30 days. After your trial, Prime is $14.99/month. Cancel anytime.</p>
<input autocomplete="cc-number"><button>Place your order</button></body></html>`;
    const checkout = await h.openFakeSite('https://www.amazon.com/gp/buy/spc/checkout', upsell);
    await new Promise((r) => setTimeout(r, 2500));
    await checkout.close();
    expect(await pending()).toEqual([]);

    const signup = await h.openFakeSite('https://www.amazon.com/amazonprime', upsell);
    const [entry] = await waitFor(async () => {
      const list = await pending();
      return list.length > 0 ? list : undefined;
    });
    await signup.close();
    expect(entry?.key).toBe('amazon-prime');
  });

  it('ignores a pricing page on the same site', async () => {
    const page = await h.openFakeSite('https://www.netflix.com/plans', PRICING_HTML);
    // Give the detector (and its 1.5s mutation debounce) time to run before asserting nothing happened.
    await new Promise((r) => setTimeout(r, 2500));
    await page.close();
    expect(await pending()).toEqual([]);
  });

  it('opens the popup, settings and overview pages without errors', async () => {
    for (const file of ['popup.html', 'options.html', 'dashboard.html'] as const) {
      const page = await h.openExtensionPage(file);
      expect(await page.$eval('h1', (el) => el.textContent)).toMatch(/Metonic/);
      await page.close();
    }
    expect(h.pageErrors).toEqual([]);
  });
});
