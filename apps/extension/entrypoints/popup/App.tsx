import {
  type BillingCycle,
  daysUntil,
  findRecipeForHost,
  formatMoney,
  formatRecurring,
  monthlyTotals,
  nextChargeOn,
  type Subscription,
  toIsoDate,
} from '@metonic/core';
import { detectCheckout } from '@metonic/core/detect';
import { useEffect, useState } from 'react';
import {
  addSubscription,
  dismissDetection,
  removeSubscription,
  trackDetection,
  updateSubscription,
} from '../../src/actions';
import { recipeById, recipes } from '../../src/recipes';
import { takeSnapshot } from '../../src/snapshot';
import { type PendingDetection, pendingDetections, subscriptions } from '../../src/storage';
import { useStorageItem } from '../../src/use-storage';

const ALL_SITES = '<all_urls>';

export function App() {
  const subs = useStorageItem(subscriptions) ?? [];
  const pending = useStorageItem(pendingDetections) ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);

  const active = subs.filter((s) => s.status !== 'cancelled');
  const totals = Object.entries(monthlyTotals(active));

  return (
    <main>
      <header>
        <h1>Metonic</h1>
        <p className="totals">
          {totals.length === 0
            ? 'No paid subscriptions yet'
            : totals.map(([currency, amountMinor]) => formatMoney({ amountMinor, currency })).join(' + ')}
          {totals.length > 0 && <span> / month</span>}
        </p>
      </header>

      {pending.length > 0 && (
        <section>
          <h2>Detected</h2>
          {pending.map((p) => (
            <PendingRow key={p.key} entry={p} />
          ))}
        </section>
      )}

      <section>
        <h2>Subscriptions ({active.length})</h2>
        {active.length === 0 && <p className="muted">Subscriptions you track show up here.</p>}
        {active.map((s) => (
          <SubscriptionRow key={s.id} sub={s} />
        ))}
      </section>

      {draft ? (
        <AddForm draft={draft} onDone={() => setDraft(null)} />
      ) : (
        <div className="actions">
          <button type="button" onClick={() => void trackThisPage().then(setDraft)}>
            Track this page
          </button>
          <button type="button" className="secondary" onClick={() => setDraft(emptyDraft())}>
            Add manually
          </button>
        </div>
      )}

      <UniversalDetectionToggle />
    </main>
  );
}

function PendingRow({ entry }: { entry: PendingDetection }) {
  const { recurring, trial } = entry.detection;
  return (
    <div className="row">
      <div>
        <strong>{entry.name}</strong>
        <div className="muted">
          {recurring ? formatRecurring(recurring.price, recurring.cycle) : 'price unknown'}
          {trial && ` · ${trial.days ? `${trial.days}-day trial` : 'trial'}`}
        </div>
      </div>
      <div className="row-actions">
        <button type="button" onClick={() => void trackDetection(entry.key)}>
          Track
        </button>
        <button type="button" className="secondary" onClick={() => void dismissDetection(entry.key)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const today = toIsoDate(new Date());
  const chargeOn = nextChargeOn(sub, today);
  const cancel = recipeById(sub.serviceId)?.actions.cancel;

  return (
    <div className="row">
      <div>
        <strong>{sub.name}</strong>
        <div className="muted">
          {sub.price.amountMinor > 0 ? formatRecurring(sub.price, sub.cycle) : 'price unknown'}
          {sub.status === 'trial' && ' · trial'}
          {sub.status === 'paused' && ' · paused'}
          {chargeOn && ` · ${describeCharge(chargeOn, sub.status === 'trial')}`}
        </div>
      </div>
      <div className="row-actions">
        {cancel && (
          <button
            type="button"
            className="secondary"
            title={cancel.instructions.join('\n')}
            onClick={() => void browser.tabs.create({ url: cancel.url })}
          >
            Cancel…
          </button>
        )}
        <button
          type="button"
          className="secondary"
          title="Mark as cancelled"
          onClick={() => void updateSubscription(sub.id, { status: 'cancelled' })}
        >
          ✓
        </button>
        <button type="button" className="secondary" title="Remove" onClick={() => void removeSubscription(sub.id)}>
          ✕
        </button>
      </div>
    </div>
  );
}

function describeCharge(on: string, isTrial: boolean): string {
  const days = daysUntil(on);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return isTrial ? `trial ends ${when}` : `renews ${when}`;
}

interface Draft {
  name: string;
  serviceId?: string;
  amount: string;
  currency: string;
  cycle: BillingCycle;
  trialEndsOn: string;
  nextChargeOn: string;
  sourceUrl?: string;
}

function emptyDraft(): Draft {
  return { name: '', amount: '', currency: 'USD', cycle: 'monthly', trialEndsOn: '', nextChargeOn: '' };
}

/** Read the active tab (via activeTab, no host permission needed) and prefill the form. */
async function trackThisPage(): Promise<Draft> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !tab.url?.startsWith('http')) return emptyDraft();

  const [injection] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: takeSnapshot });
  const snapshot = injection?.result;
  const host = new URL(tab.url).hostname.replace(/^www\./, '');
  const recipe = findRecipeForHost(recipes, host);
  const draft: Draft = { ...emptyDraft(), name: recipe?.name ?? host, sourceUrl: tab.url };
  if (recipe) draft.serviceId = recipe.id;
  if (!snapshot) return draft;

  const { recurring, trial } = detectCheckout(snapshot);
  if (recurring) {
    draft.amount = (recurring.price.amountMinor / 100).toFixed(2);
    draft.currency = recurring.price.currency;
    draft.cycle = recurring.cycle;
  }
  if (trial?.days) {
    const end = new Date();
    end.setDate(end.getDate() + trial.days);
    draft.trialEndsOn = toIsoDate(end);
  }
  return draft;
}

function AddForm({ draft: initial, onDone }: { draft: Draft; onDone: () => void }) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const amount = Number.parseFloat(draft.amount.replace(',', '.'));
    const isTrial = draft.trialEndsOn !== '';
    await addSubscription({
      name: draft.name.trim(),
      ...(draft.serviceId && { serviceId: draft.serviceId }),
      price: {
        amountMinor: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
        currency: draft.currency.toUpperCase(),
      },
      cycle: draft.cycle,
      status: isTrial ? 'trial' : 'active',
      ...(isTrial && { trialEndsOn: draft.trialEndsOn }),
      ...((draft.trialEndsOn || draft.nextChargeOn) && { billingAnchorOn: draft.trialEndsOn || draft.nextChargeOn }),
      source: draft.sourceUrl ? 'detected' : 'manual',
      ...(draft.sourceUrl && { sourceUrl: draft.sourceUrl }),
    });
    onDone();
  };

  return (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <input required placeholder="Name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <div className="inline">
        <input
          inputMode="decimal"
          placeholder="Price"
          value={draft.amount}
          onChange={(e) => set('amount', e.target.value)}
        />
        <input
          className="currency"
          maxLength={3}
          value={draft.currency}
          onChange={(e) => set('currency', e.target.value)}
        />
        <select value={draft.cycle} onChange={(e) => set('cycle', e.target.value as BillingCycle)}>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="quarterly">quarterly</option>
          <option value="yearly">yearly</option>
        </select>
      </div>
      <label>
        Free trial ends
        <input type="date" value={draft.trialEndsOn} onChange={(e) => set('trialEndsOn', e.target.value)} />
      </label>
      {draft.trialEndsOn === '' && (
        <label>
          Next charge
          <input type="date" value={draft.nextChargeOn} onChange={(e) => set('nextChargeOn', e.target.value)} />
        </label>
      )}
      <div className="actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function UniversalDetectionToggle() {
  const [enabled, setEnabled] = useState<boolean>();

  useEffect(() => {
    void browser.permissions.contains({ origins: [ALL_SITES] }).then(setEnabled);
  }, []);

  if (enabled === undefined) return null;

  const toggle = async () => {
    // Must run inside the click handler: permission prompts need a user gesture.
    const ok = enabled
      ? await browser.permissions.remove({ origins: [ALL_SITES] })
      : await browser.permissions.request({ origins: [ALL_SITES] });
    if (ok) setEnabled(!enabled);
  };

  return (
    <label className="toggle">
      <input type="checkbox" checked={enabled} onChange={() => void toggle()} />
      Detect subscriptions on every site, not just the {recipes.length} known services
    </label>
  );
}
