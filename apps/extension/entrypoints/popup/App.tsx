import {
  daysUntil,
  findRecipeForHost,
  formatMoney,
  formatRecurring,
  monthlyTotals,
  nextChargeOn,
  type Subscription,
  toDecimalString,
  toIsoDate,
} from '@metonic/core';
import { detectCheckout } from '@metonic/core/detect';
import { useState } from 'react';
import { dismissDetection, trackDetection, updateSubscription } from '../../src/actions';
import { recipeById, recipes } from '../../src/recipes';
import { takeSnapshot } from '../../src/snapshot';
import { type PendingDetection, pendingDetections, subscriptions } from '../../src/storage';
import { useStorageItem } from '../../src/use-storage';
import { type Draft, draftFrom, emptyDraft, SubscriptionForm } from './SubscriptionForm';

type Editing = { draft: Draft; sub?: Subscription };

export function App() {
  const subs = useStorageItem(subscriptions) ?? [];
  const pending = useStorageItem(pendingDetections) ?? [];
  const [editing, setEditing] = useState<Editing | null>(null);

  const active = subs.filter((s) => s.status !== 'cancelled');
  const totals = Object.entries(monthlyTotals(active));
  const edit = (sub: Subscription) => setEditing({ draft: draftFrom(sub), sub });

  if (editing) {
    return (
      <main>
        <header>
          <h1>{editing.sub ? `Edit ${editing.sub.name}` : 'Add subscription'}</h1>
        </header>
        <SubscriptionForm
          initial={editing.draft}
          {...(editing.sub && { editing: editing.sub })}
          onDone={() => setEditing(null)}
        />
      </main>
    );
  }

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
          <SubscriptionRow key={s.id} sub={s} onEdit={() => edit(s)} />
        ))}
      </section>

      <div className="actions">
        <button type="button" onClick={() => void trackThisPage().then((draft) => setEditing({ draft }))}>
          Track this page
        </button>
        <button type="button" className="secondary" onClick={() => setEditing({ draft: emptyDraft() })}>
          Add manually
        </button>
        <button
          type="button"
          className="link push-right"
          onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') })}
        >
          Overview
        </button>
        <button type="button" className="link" onClick={() => void browser.runtime.openOptionsPage()}>
          Settings
        </button>
      </div>
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

function SubscriptionRow({ sub, onEdit }: { sub: Subscription; onEdit: () => void }) {
  const today = toIsoDate(new Date());
  const chargeOn = nextChargeOn(sub, today);
  const cancel = recipeById(sub.serviceId)?.actions.cancel;
  const priceUnknown = sub.price.amountMinor === 0;

  return (
    <div className="row">
      <button type="button" className="row-main" title="Edit" onClick={onEdit}>
        <strong>{sub.name}</strong>
        <span className="muted">
          {priceUnknown ? <span className="warn">add price</span> : formatRecurring(sub.price, sub.cycle)}
          {sub.status === 'trial' && ' · trial'}
          {sub.status === 'paused' && ` · paused${sub.pausedUntil ? ` until ${sub.pausedUntil}` : ''}`}
          {chargeOn && ` · ${describeCharge(chargeOn, sub.status === 'trial')}`}
        </span>
      </button>
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
      </div>
    </div>
  );
}

function describeCharge(on: string, isTrial: boolean): string {
  const days = daysUntil(on);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return isTrial ? `trial ends ${when}` : `renews ${when}`;
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
    draft.amount = toDecimalString(recurring.price);
    draft.currency = recurring.price.currency;
    draft.cycle = recurring.cycle;
  }
  if (trial) {
    draft.status = 'trial';
    if (trial.days) {
      const end = new Date();
      end.setDate(end.getDate() + trial.days);
      draft.trialEndsOn = toIsoDate(end);
    }
  }
  return draft;
}
