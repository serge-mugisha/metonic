import { z } from 'zod';
import type { Subscription } from './subscription';

export const EXPORT_FORMAT = 'metonic-export';
export const EXPORT_VERSION = 1;

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const SubscriptionSchema = z.object({
  id: z.string().min(1),
  serviceId: z.string().optional(),
  name: z.string().min(1),
  price: z.object({
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/, 'expected an ISO 4217 code like USD'),
  }),
  cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  status: z.enum(['trial', 'active', 'paused', 'cancelled']),
  startedOn: IsoDate.optional(),
  billingAnchorOn: IsoDate.optional(),
  trialEndsOn: IsoDate.optional(),
  pausedUntil: IsoDate.optional(),
  source: z.enum(['detected', 'manual', 'imported']),
  sourceUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Subscription>;

export interface MetonicExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  subscriptions: Subscription[];
}

export function createExport(subscriptions: Subscription[], now = new Date()): MetonicExport {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), subscriptions };
}

export interface ImportResult {
  /** The full list to store: existing subscriptions merged with valid imported ones. */
  subscriptions: Subscription[];
  added: number;
  updated: number;
  /** Rows kept as-is because the existing copy is at least as recent. */
  unchanged: number;
  invalid: { index: number; name?: string; error: string }[];
}

export class ImportError extends Error {}

/**
 * Parse an export file and merge it into `existing` by id. The newer `updatedAt` wins.
 * Throws ImportError if the file isn't a Metonic export at all; individual bad rows are
 * reported in `invalid` and skipped. Nothing is written here, so callers store the result
 * in one go and a bad file can never leave storage half-imported.
 */
export function mergeImport(text: string, existing: Subscription[]): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }

  const header = z
    .object({ format: z.literal(EXPORT_FORMAT), version: z.number(), subscriptions: z.array(z.unknown()) })
    .safeParse(data);
  if (!header.success) throw new ImportError('This is not a Metonic export file.');
  if (header.data.version > EXPORT_VERSION) {
    throw new ImportError(
      `This file was made by a newer version of Metonic (format v${header.data.version}). Update the extension first.`,
    );
  }

  const byId = new Map(existing.map((s) => [s.id, s]));
  const result: ImportResult = { subscriptions: [], added: 0, updated: 0, unchanged: 0, invalid: [] };

  header.data.subscriptions.forEach((row, index) => {
    const parsed = SubscriptionSchema.safeParse(row);
    if (!parsed.success) {
      const name = typeof row === 'object' && row && 'name' in row ? String(row.name) : undefined;
      const issue = parsed.error.issues[0];
      result.invalid.push({
        index,
        ...(name && { name }),
        error: issue ? `${issue.path.join('.') || 'row'}: ${issue.message}` : 'invalid',
      });
      return;
    }
    const incoming = stripUndefined(parsed.data);
    const current = byId.get(incoming.id);
    if (!current) {
      result.added++;
      byId.set(incoming.id, incoming);
    } else if (Date.parse(incoming.updatedAt) > Date.parse(current.updatedAt)) {
      result.updated++;
      byId.set(incoming.id, incoming);
    } else {
      result.unchanged++;
    }
  });

  result.subscriptions = [...byId.values()];
  return result;
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
