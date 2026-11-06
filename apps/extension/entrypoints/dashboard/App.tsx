import {
  CATEGORY_LABEL,
  type CategorySpend,
  daysUntil,
  formatMoney,
  formatRecurring,
  monthlyTotals,
  type PerCurrency,
  type Subscription,
  savedPerMonth,
  spendByCategory,
  toIsoDate,
  type UpcomingCharge,
  upcomingCharges,
  yearlyTotals,
} from '@metonic/core';
import { categoryOf } from '../../src/recipes';
import { subscriptions } from '../../src/storage';
import { useStorageItem } from '../../src/use-storage';

const UPCOMING_DAYS = 30;

export function App() {
  const subs = useStorageItem(subscriptions);
  if (!subs) return null;

  const current = subs.filter((s) => s.status !== 'cancelled');
  const cancelled = subs.filter((s) => s.status === 'cancelled');
  const trials = current.filter((s) => s.status === 'trial').length;
  const today = toIsoDate(new Date());

  return (
    <main>
      <header className="page-header">
        <h1>Metonic overview</h1>
        <button type="button" className="link" onClick={() => void browser.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      <section className="kpis" aria-label="Totals">
        <Kpi label="Per month" value={money(monthlyTotals(current))} />
        <Kpi label="Per year" value={money(yearlyTotals(current))} />
        <Kpi label="Tracked" value={String(current.length)} note={trials > 0 ? `${trials} in free trial` : undefined} />
        <Kpi
          label="Saved by cancelling"
          value={money(savedPerMonth(cancelled))}
          note={cancelled.length > 0 ? 'per month' : undefined}
        />
      </section>

      <section>
        <h2>Next {UPCOMING_DAYS} days</h2>
        <Upcoming charges={upcomingCharges(current, today, UPCOMING_DAYS)} />
      </section>

      <section>
        <h2>Monthly spend by category</h2>
        <Categories byCurrency={spendByCategory(current, categoryOf)} />
      </section>

      {cancelled.length > 0 && (
        <section>
          <h2>Cancelled ({cancelled.length})</h2>
          <Cancelled subs={cancelled} />
        </section>
      )}
    </main>
  );
}

function money(totals: PerCurrency): string {
  const entries = Object.entries(totals);
  if (entries.length === 0) return '–';
  return entries.map(([currency, amountMinor]) => formatMoney({ amountMinor, currency })).join(' + ');
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string | undefined }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="muted">{note}</div>}
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function describeDay(on: string): string {
  const days = daysUntil(on);
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
}

function Upcoming({ charges }: { charges: UpcomingCharge[] }) {
  if (charges.length === 0) {
    return <p className="muted">Nothing due. Subscriptions need a next charge date to show up here.</p>;
  }
  const totals: PerCurrency = {};
  for (const { sub } of charges) {
    if (sub.status === 'trial') continue; // a trial's first charge isn't certain yet
    totals[sub.price.currency] = (totals[sub.price.currency] ?? 0) + sub.price.amountMinor;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Subscription</th>
          <th scope="col">What happens</th>
          <th scope="col" className="num">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {charges.map(({ sub, on, kind }) => (
          <tr key={`${sub.id}:${on}`}>
            <td>
              {dateFormat.format(new Date(`${on}T00:00:00`))} <span className="muted">{describeDay(on)}</span>
            </td>
            <td>{sub.name}</td>
            <td>{kind === 'trial-end' ? <span className="tag">⚠ Free trial ends</span> : 'Renews'}</td>
            <td className="num">{sub.price.amountMinor > 0 ? formatMoney(sub.price) : '?'}</td>
          </tr>
        ))}
      </tbody>
      {Object.keys(totals).length > 0 && (
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Renewals in the next {UPCOMING_DAYS} days
            </th>
            <td className="num">{money(totals)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function Categories({ byCurrency }: { byCurrency: Record<string, CategorySpend[]> }) {
  const currencies = Object.keys(byCurrency);
  if (currencies.length === 0) return <p className="muted">Active subscriptions with a price show up here.</p>;
  return (
    <>
      {currencies.map((currency) => (
        <CategoryBars
          key={currency}
          currency={currency}
          rows={byCurrency[currency] ?? []}
          showCurrency={currencies.length > 1}
        />
      ))}
    </>
  );
}

/** Ranked horizontal bars, one hue, largest first, each value printed beside its bar. */
function CategoryBars({
  currency,
  rows,
  showCurrency,
}: {
  currency: string;
  rows: CategorySpend[];
  showCurrency: boolean;
}) {
  const max = Math.max(...rows.map((r) => r.monthlyMinor));
  const total = rows.reduce((sum, r) => sum + r.monthlyMinor, 0);
  return (
    <div className="bars">
      {showCurrency && <h3>{currency}</h3>}
      {rows.map((row) => {
        const amount = formatMoney({ amountMinor: row.monthlyMinor, currency });
        const share = Math.round((row.monthlyMinor / total) * 100);
        return (
          <div
            key={row.category}
            className="bar-row"
            title={`${CATEGORY_LABEL[row.category]}: ${amount}/month, ${share}% of ${currency} spend, ${row.count} subscription${row.count === 1 ? '' : 's'}`}
          >
            <span className="bar-label">{CATEGORY_LABEL[row.category]}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${(row.monthlyMinor / max) * 100}%` }} />
            </span>
            <span className="bar-value">{amount}</span>
          </div>
        );
      })}
    </div>
  );
}

function Cancelled({ subs }: { subs: Subscription[] }) {
  return (
    <ul className="plain">
      {subs.map((sub) => (
        <li key={sub.id}>
          {sub.name}{' '}
          <span className="muted">
            {sub.price.amountMinor > 0 ? formatRecurring(sub.price, sub.cycle) : 'price unknown'}
          </span>
        </li>
      ))}
    </ul>
  );
}
