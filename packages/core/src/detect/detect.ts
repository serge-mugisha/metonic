import { type Money, parseDecimal, toMinorUnits } from '../money';
import type { BillingCycle } from '../subscription';

/**
 * Heuristic, AI-free detection of subscription checkout pages. This runs on every
 * matched page load, so it must stay cheap and synchronous. An optional AI pass can
 * refine uncertain results later; the heuristics must stand on their own.
 */

export interface PageSnapshot {
  url: string;
  title: string;
  /** Visible page text, already truncated by the caller. */
  text: string;
  /** True when the page has a card-number style input (autocomplete="cc-number" etc.). */
  hasCardField: boolean;
  /** `<html lang>`, used to tell "$" (USD/CAD/AUD) and "kr" (SEK/NOK/DKK) apart. */
  lang?: string;
}

export interface RecurringPrice {
  price: Money;
  cycle: BillingCycle;
}

export interface CheckoutDetection {
  isLikelyCheckout: boolean;
  /** 0..1 */
  confidence: number;
  reasons: string[];
  recurring?: RecurringPrice;
  trial?: { days?: number };
}

const CHECKOUT_PATH =
  /\/(checkout|subscribe|signup|sign-up|payment|billing|plans?|join|upgrade|membership|purchase)\b/i;

const SUBSCRIPTION_VOCAB = [
  /\bsubscri(be|ption)\b/i,
  /\bmembership\b/i,
  /\bauto[- ]?renew/i,
  /\brenews?\b/i,
  /\brecurring\b/i,
  /\bcancel any ?time\b/i,
  /\bbilled (monthly|annually|yearly|weekly)\b/i,
];

const START_CTA =
  /\b(start (my |your )?(membership|subscription|free trial|trial|plan)|subscribe now|join now|upgrade now|confirm (and|&) pay|start watching|try (it )?free)\b/i;

/* ------------------------------------------------------------------ prices */

/** Optional page context used to resolve ambiguous symbols like "$" and "kr". */
export interface LocaleHints {
  url?: string;
  /** `<html lang>`, e.g. "en-CA". */
  lang?: string;
}

const ISO_CODES = 'USD|EUR|GBP|CAD|AUD|NZD|CHF|SEK|NOK|DKK|ISK|PLN|CZK|HUF|JPY|CNY|INR|BRL|MXN|ZAR|SGD|HKD|KRW|TRY';
// Longest alternatives first so "US$" wins over "$".
const CURRENCY = String.raw`(?:${ISO_CODES}|US\$|CA\$|C\$|AU\$|A\$|NZ\$|HK\$|S\$|R\$|MX\$|zł|Kč|kr\.?|Fr\.|[$€£¥₹₩₺円])`;
// "1,199.00", "1.199,00", "1 199,00" (incl. no-break spaces), "9,99", "15".
const AMOUNT = String.raw`(?:\d{1,3}(?:[.,   ]\d{3})+(?:[.,]\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?)`;

const PERIOD_WORDS: Record<BillingCycle, string> = {
  weekly: 'week|wk|woche|semaine|semana|settimana|uke|vecka|uge|tydzień|週',
  monthly: String.raw`month|mo|mth|monat|mon\.|mois|mes|mês|mese|maand|mnd|månaden|månad|mån|måneden|måned|md\.?|miesiąc|mies\.?|月`,
  quarterly: 'quarter|quartal|trimestre|kwartaal|kvartal',
  yearly: 'year|yr|annum|jahr|année|an|año|ano|anno|jaar|året|år|rok|年',
};
const PERIOD_ADVERBS: Record<BillingCycle, string> = {
  weekly: 'weekly|wöchentlich|hebdomadaire|semanal|settimanale|wekelijks|ukentlig|ugentlig|tygodniowo',
  monthly: String.raw`monthly|monatlich|mtl\.|mensuel(?:lement)?|mensual(?:mente)?|mensal(?:mente)?|mensile|maandelijks|månadsvis|månedlig|miesięcznie|p\.m\.?|p/m`,
  quarterly: 'quarterly|vierteljährlich|trimestriel(?:lement)?|trimestral|trimestrale|kwartaalijks',
  yearly: String.raw`yearly|annually|jährlich|annuel(?:lement)?|anual(?:mente)?|annuale|jaarlijks|årlig|rocznie|p\.a\.?`,
};
// "/", "per", "a", "pro Monat", "par mois", "al mes", "i månaden", "om måneden", "pr. mnd", "na miesiąc", "im Monat".
const SEPARATOR = String.raw`(?:/\s*|(?:per|a|each|every|pro|im|par|por|al|il|i|om|pr\.?|na|w|za)\s+)`;

const allWords = (table: Record<BillingCycle, string>) => Object.values(table).join('|');
// Unicode-aware word end: \b treats letters like "å" as non-word characters.
const NOT_LETTER = String.raw`(?!\p{L})`;
const PERIOD = `(?:${SEPARATOR}(?<word>${allWords(PERIOD_WORDS)})|(?<adverb>${allWords(PERIOD_ADVERBS)}))${NOT_LETTER}`;

const PRICE = new RegExp(
  String.raw`(?<![\p{L}\d])(?:(?<curBefore>${CURRENCY})\s?(?<amtAfter>${AMOUNT})|(?<amtBefore>${AMOUNT})\s?(?<curAfter>${CURRENCY}))\s*${PERIOD}`,
  'iu',
);

const cycleMatchers = (table: Record<BillingCycle, string>) =>
  (Object.entries(table) as [BillingCycle, string][]).map(
    ([cycle, words]) => [cycle, new RegExp(`^(?:${words})$`, 'iu')] as const,
  );
const WORD_CYCLES = cycleMatchers(PERIOD_WORDS);
const ADVERB_CYCLES = cycleMatchers(PERIOD_ADVERBS);

function cycleFrom(token: string, table: typeof WORD_CYCLES): BillingCycle {
  return table.find(([, re]) => re.test(token))?.[0] ?? 'monthly';
}

/** Region (upper-case, e.g. "CA") and language (lower-case, e.g. "fr") from `lang` and the URL's TLD. */
export function localeOf(hints: LocaleHints = {}): { region?: string; language?: string } {
  const [language, region] = (hints.lang ?? '').toLowerCase().split(/[-_]/);
  let tld: string | undefined;
  try {
    if (hints.url) tld = new URL(hints.url).hostname.split('.').pop();
  } catch {
    // Malformed URL: no TLD hint.
  }
  const resolvedRegion =
    region?.length === 2 ? region.toUpperCase() : tld?.length === 2 ? tld.toUpperCase() : undefined;
  return { ...(resolvedRegion && { region: resolvedRegion }), ...(language && { language }) };
}

const DOLLAR_BY_REGION: Record<string, string> = { CA: 'CAD', AU: 'AUD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', MX: 'MXN' };
const KRONA_BY_REGION: Record<string, string> = { SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK' };
const KRONA_BY_LANGUAGE: Record<string, string> = { sv: 'SEK', nb: 'NOK', nn: 'NOK', no: 'NOK', da: 'DKK', is: 'ISK' };
const SYMBOLS: Record<string, string> = {
  us$: 'USD',
  ca$: 'CAD',
  c$: 'CAD',
  au$: 'AUD',
  a$: 'AUD',
  nz$: 'NZD',
  hk$: 'HKD',
  s$: 'SGD',
  r$: 'BRL',
  mx$: 'MXN',
  zł: 'PLN',
  kč: 'CZK',
  'fr.': 'CHF',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
  '₩': 'KRW',
  '₺': 'TRY',
  円: 'JPY',
};

/** ISO 4217 code for a currency token as written on a page, using locale hints for "$", "¥" and "kr". */
export function currencyCode(raw: string, hints: LocaleHints = {}): string {
  const token = raw.toLowerCase();
  const known = SYMBOLS[token];
  if (known) return known;
  const { region, language } = localeOf(hints);
  if (token === '$') return (region && DOLLAR_BY_REGION[region]) ?? 'USD';
  if (token === '¥') return region === 'CN' || language === 'zh' ? 'CNY' : 'JPY';
  if (token.startsWith('kr')) {
    return (region && KRONA_BY_REGION[region]) ?? (language && KRONA_BY_LANGUAGE[language]) ?? 'SEK';
  }
  return raw.toUpperCase();
}

export function parseRecurringPrice(text: string, hints: LocaleHints = {}): RecurringPrice | undefined {
  const g = PRICE.exec(text)?.groups;
  if (!g) return undefined;
  const cur = g.curBefore ?? g.curAfter ?? '';
  const value = parseDecimal(g.amtAfter ?? g.amtBefore ?? '');
  if (value === undefined || value <= 0) return undefined;
  const currency = currencyCode(cur, hints);
  return {
    price: { amountMinor: toMinorUnits(value, currency), currency },
    cycle: g.word ? cycleFrom(g.word, WORD_CYCLES) : cycleFrom(g.adverb ?? '', ADVERB_CYCLES),
  };
}

/* ------------------------------------------------------------------ trials */

const TRIAL_WITH_LENGTH = /\b(?<n>\d{1,3})[- ](?<unit>day|week|month)s?\s+(?:free\s+)?trial\b/i;
const FREE_FOR_LENGTH = /\bfree\s+for\s+(?<n>\d{1,3})\s+(?<unit>day|week|month)s?\b/i;
const TRIAL_ANY = /\bfree trial\b|\btrial ends\b/i;

export function parseTrial(text: string): { days?: number } | undefined {
  const m = TRIAL_WITH_LENGTH.exec(text) ?? FREE_FOR_LENGTH.exec(text);
  if (m?.groups) {
    const n = Number.parseInt(m.groups.n ?? '', 10);
    const perUnit = { day: 1, week: 7, month: 30 }[(m.groups.unit ?? 'day').toLowerCase() as 'day' | 'week' | 'month'];
    return { days: n * perUnit };
  }
  return TRIAL_ANY.test(text) ? {} : undefined;
}

/* ---------------------------------------------------------------- checkout */

export const CHECKOUT_THRESHOLD = 0.6;

export function detectCheckout(page: PageSnapshot): CheckoutDetection {
  const reasons: string[] = [];
  let score = 0;

  if (page.hasCardField) {
    score += 0.35;
    reasons.push('card number field');
  }

  let path = '';
  try {
    path = new URL(page.url).pathname;
  } catch {
    // Ignore malformed URLs; the text signals still apply.
  }
  if (CHECKOUT_PATH.test(path)) {
    score += 0.15;
    reasons.push('checkout-like URL');
  }

  const haystack = `${page.title}\n${page.text}`;

  const recurring = parseRecurringPrice(haystack, { url: page.url, ...(page.lang && { lang: page.lang }) });
  if (recurring) {
    score += 0.3;
    reasons.push('recurring price');
  }

  const trial = parseTrial(haystack);
  if (trial) {
    score += 0.15;
    reasons.push('free trial');
  }

  const vocabHits = SUBSCRIPTION_VOCAB.filter((re) => re.test(haystack)).length;
  if (vocabHits > 0) {
    score += Math.min(vocabHits * 0.05, 0.2);
    reasons.push(`${vocabHits} subscription term(s)`);
  }

  const hasStartCta = START_CTA.test(haystack);
  if (hasStartCta) {
    score += 0.1;
    reasons.push('start/subscribe button text');
  }

  const confidence = Math.min(score, 1);
  // Pricing pages are full of recurring prices; require a payment field or a commit-style CTA.
  const isLikelyCheckout = confidence >= CHECKOUT_THRESHOLD && (page.hasCardField || hasStartCta);

  return {
    isLikelyCheckout,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    ...(recurring && { recurring }),
    ...(trial && { trial }),
  };
}
