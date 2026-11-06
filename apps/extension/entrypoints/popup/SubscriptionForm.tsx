import {
  type BillingCycle,
  nextChargeOn,
  parseAmountInput,
  type Subscription,
  type SubscriptionStatus,
  toDecimalString,
  toIsoDate,
} from '@metonic/core';
import { useState } from 'react';
import { addSubscription, removeSubscription, replaceSubscription, type SubscriptionFields } from '../../src/actions';

/** Form state: everything as strings, the way inputs hold it. */
export interface Draft {
  name: string;
  serviceId?: string;
  amount: string;
  currency: string;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  trialEndsOn: string;
  nextChargeOn: string;
  pausedUntil: string;
  notes: string;
  sourceUrl?: string;
}

export function emptyDraft(): Draft {
  return {
    name: '',
    amount: '',
    currency: 'USD',
    cycle: 'monthly',
    status: 'active',
    trialEndsOn: '',
    nextChargeOn: '',
    pausedUntil: '',
    notes: '',
  };
}

export function draftFrom(sub: Subscription): Draft {
  const today = toIsoDate(new Date());
  return {
    name: sub.name,
    ...(sub.serviceId && { serviceId: sub.serviceId }),
    amount: sub.price.amountMinor > 0 ? toDecimalString(sub.price) : '',
    currency: sub.price.currency,
    cycle: sub.cycle,
    status: sub.status,
    trialEndsOn: sub.trialEndsOn ?? '',
    // Show the upcoming charge rather than the stored anchor, which may be in the past.
    nextChargeOn: nextChargeOn({ ...sub, status: 'active' }, today) ?? '',
    pausedUntil: sub.pausedUntil ?? '',
    notes: sub.notes ?? '',
    ...(sub.sourceUrl && { sourceUrl: sub.sourceUrl }),
  };
}

function toFields(draft: Draft, existing?: Subscription): SubscriptionFields {
  const { status } = draft;
  // The billing anchor is any real charge date; renewals repeat from it.
  const anchor =
    status === 'trial' ? draft.trialEndsOn || draft.nextChargeOn : draft.nextChargeOn || existing?.billingAnchorOn;
  return {
    name: draft.name.trim(),
    ...(draft.serviceId && { serviceId: draft.serviceId }),
    price: {
      amountMinor: parseAmountInput(draft.amount, normalizeCurrency(draft.currency)) ?? 0,
      currency: normalizeCurrency(draft.currency),
    },
    cycle: draft.cycle,
    status,
    ...(existing?.startedOn && { startedOn: existing.startedOn }),
    ...(anchor && { billingAnchorOn: anchor }),
    ...(status === 'trial' && draft.trialEndsOn && { trialEndsOn: draft.trialEndsOn }),
    ...(status === 'paused' && draft.pausedUntil && { pausedUntil: draft.pausedUntil }),
    source: existing?.source ?? (draft.sourceUrl ? 'detected' : 'manual'),
    ...(draft.sourceUrl && { sourceUrl: draft.sourceUrl }),
    ...(draft.notes.trim() && { notes: draft.notes.trim() }),
  };
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Free trial',
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export function SubscriptionForm({
  initial,
  editing,
  onDone,
}: {
  initial: Draft;
  /** The subscription being edited; omit to add a new one. */
  editing?: Subscription;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const priceInvalid =
    draft.amount.trim() !== '' && parseAmountInput(draft.amount, normalizeCurrency(draft.currency)) === undefined;

  const save = async () => {
    const fields = toFields(draft, editing);
    if (editing) await replaceSubscription(editing.id, fields);
    else await addSubscription({ ...fields, startedOn: toIsoDate(new Date()) });
    onDone();
  };

  return (
    <form
      className="sub-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!priceInvalid) void save();
      }}
    >
      <input required placeholder="Name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <div className="inline">
        <input
          inputMode="decimal"
          placeholder="Price"
          aria-label="Price"
          aria-invalid={priceInvalid}
          value={draft.amount}
          onChange={(e) => set('amount', e.target.value)}
        />
        <input
          className="currency"
          aria-label="Currency"
          required
          pattern="[A-Za-z]{3}"
          maxLength={3}
          value={draft.currency}
          onChange={(e) => set('currency', e.target.value)}
        />
        <select
          aria-label="Billing cycle"
          value={draft.cycle}
          onChange={(e) => set('cycle', e.target.value as BillingCycle)}
        >
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="quarterly">quarterly</option>
          <option value="yearly">yearly</option>
        </select>
      </div>
      {draft.amount.trim() === '' && <p className="warn">Add the price so it counts toward your totals.</p>}
      <label>
        Status
        <select value={draft.status} onChange={(e) => set('status', e.target.value as SubscriptionStatus)}>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {draft.status === 'trial' && (
        <label>
          Free trial ends
          <input type="date" value={draft.trialEndsOn} onChange={(e) => set('trialEndsOn', e.target.value)} />
        </label>
      )}
      {draft.status === 'active' && (
        <label>
          Next charge
          <input type="date" value={draft.nextChargeOn} onChange={(e) => set('nextChargeOn', e.target.value)} />
        </label>
      )}
      {draft.status === 'paused' && (
        <label>
          Paused until (optional)
          <input type="date" value={draft.pausedUntil} onChange={(e) => set('pausedUntil', e.target.value)} />
        </label>
      )}
      <label>
        Notes
        <textarea rows={2} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <div className="actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onDone}>
          Cancel
        </button>
        {editing && (
          <button
            type="button"
            className="secondary danger"
            onClick={() => void removeSubscription(editing.id).then(onDone)}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function normalizeCurrency(input: string): string {
  return input.trim().toUpperCase();
}
