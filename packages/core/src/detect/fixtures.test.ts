/// <reference types="node" />
// Test-only: core source must stay browser-safe (enforced by the Biome override in biome.json).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectCheckout, type PageSnapshot, type RecurringPrice } from './detect';

/**
 * Regression fixtures: page snapshots with the result we expect. See fixtures/README.md
 * for how to capture one. `null` means "must be absent"; a missing key means "don't care".
 */
interface Fixture extends PageSnapshot {
  description: string;
  source: string;
  expected: {
    isLikelyCheckout: boolean;
    recurring?: RecurringPrice | null;
    trial?: { days?: number } | null;
  };
  /** Known wrong today. The test asserts it still fails, so fixing it forces removing this flag. */
  knownIssue?: string;
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Fixture] as const);

function check({ expected, ...page }: Fixture) {
  const result = detectCheckout(page);
  expect(result.isLikelyCheckout, result.reasons.join(', ')).toBe(expected.isLikelyCheckout);
  if (expected.recurring !== undefined) expect(result.recurring).toEqual(expected.recurring ?? undefined);
  if (expected.trial !== undefined) expect(result.trial).toEqual(expected.trial ?? undefined);
}

describe('detection fixtures', () => {
  it('has a healthy mix of positives and negatives', () => {
    const positives = fixtures.filter(([, f]) => f.expected.isLikelyCheckout).length;
    expect(positives).toBeGreaterThanOrEqual(10);
    expect(fixtures.length - positives).toBeGreaterThanOrEqual(10);
  });

  for (const [name, fixture] of fixtures) {
    if (fixture.knownIssue) it.fails(`${name} (known issue: ${fixture.knownIssue})`, () => check(fixture));
    else it(`${name}: ${fixture.description}`, () => check(fixture));
  }
});
