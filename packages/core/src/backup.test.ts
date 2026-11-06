import { describe, expect, it } from 'vitest';
import { createExport, ImportError, mergeImport } from './backup';
import type { Subscription } from './subscription';

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'a',
    serviceId: 'netflix',
    name: 'Netflix',
    price: { amountMinor: 1549, currency: 'USD' },
    cycle: 'monthly',
    status: 'trial',
    startedOn: '2026-01-01',
    billingAnchorOn: '2026-01-31',
    trialEndsOn: '2026-01-31',
    source: 'detected',
    sourceUrl: 'https://www.netflix.com/signup',
    notes: 'family plan',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

const file = (subs: unknown[], extra: object = {}) =>
  JSON.stringify({ format: 'metonic-export', version: 1, subscriptions: subs, ...extra });

describe('export/import', () => {
  it('round-trips losslessly', () => {
    const subs = [sub(), sub({ id: 'b', name: 'Spotify', status: 'paused', pausedUntil: '2026-03-01' })];
    const text = JSON.stringify(createExport(subs));
    const result = mergeImport(text, []);
    expect(result.subscriptions).toEqual(subs);
    expect(result).toMatchObject({ added: 2, updated: 0, unchanged: 0, invalid: [] });
  });

  it('merges by id, newest updatedAt wins', () => {
    const existing = [sub({ name: 'Old', updatedAt: '2026-02-01T00:00:00Z' }), sub({ id: 'keep' })];
    const result = mergeImport(
      file([
        sub({ name: 'Older', updatedAt: '2026-01-15T00:00:00Z' }),
        sub({ id: 'keep', name: 'Newer', updatedAt: '2026-03-01T00:00:00Z' }),
      ]),
      existing,
    );
    expect(result.subscriptions.map((s) => s.name)).toEqual(['Old', 'Newer']);
    expect(result).toMatchObject({ added: 0, updated: 1, unchanged: 1 });
  });

  it('skips and reports invalid rows', () => {
    const result = mergeImport(
      file([sub({ id: 'ok' }), { ...sub({ id: 'bad' }), price: { amountMinor: -1, currency: 'USD' } }, 42]),
      [],
    );
    expect(result.subscriptions.map((s) => s.id)).toEqual(['ok']);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0]).toMatchObject({ index: 1, name: 'Netflix' });
    expect(result.invalid[0]?.error).toContain('price.amountMinor');
  });

  it('rejects files that are not Metonic exports', () => {
    expect(() => mergeImport('not json', [])).toThrow(ImportError);
    expect(() => mergeImport('{"subscriptions":[]}', [])).toThrow('not a Metonic export');
    expect(() => mergeImport(file([], { version: 99 }), [])).toThrow('newer version');
  });
});
