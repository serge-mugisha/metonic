import { ImportError, type ImportResult, toIsoDate } from '@metonic/core';
import { useState } from 'react';
import { exportSubscriptions, importSubscriptions } from '../../src/actions';
import { type PromptStyle, settings } from '../../src/storage';
import { UniversalDetectionToggle } from '../../src/ui/UniversalDetectionToggle';
import { useStorageItem } from '../../src/use-storage';

export function App() {
  return (
    <main>
      <h1>Metonic settings</h1>

      <section>
        <h2>Detection</h2>
        <PromptChoice />
        <UniversalDetectionToggle />
      </section>

      <section>
        <h2>Reminders</h2>
        <ReminderDays />
      </section>

      <section>
        <h2>Backup</h2>
        <p className="muted">
          Your subscriptions are stored only in this browser. Export them to keep a backup or move to another browser.
          Importing merges by subscription, keeping whichever copy was edited last.
        </p>
        <Backup />
      </section>
    </main>
  );
}

function ReminderDays() {
  const current = useStorageItem(settings);
  if (!current) return null;
  return (
    <label className="inline-label">
      Remind me{' '}
      <input
        type="number"
        min={0}
        max={30}
        value={current.reminderDays}
        onChange={(e) => {
          const days = Math.min(30, Math.max(0, Math.round(e.target.valueAsNumber)));
          if (Number.isFinite(days)) void settings.update({ reminderDays: days });
        }}
      />{' '}
      days before a free trial ends or a subscription renews.
    </label>
  );
}

const PROMPT_LABELS: Record<PromptStyle, string> = {
  page: 'A small card on the page',
  notification: 'A system notification',
  both: 'Both',
};

function PromptChoice() {
  const current = useStorageItem(settings);
  if (!current) return null;
  return (
    <fieldset className="choice">
      <legend>When Metonic spots a subscription checkout, ask with</legend>
      {(Object.keys(PROMPT_LABELS) as PromptStyle[]).map((style) => (
        <label key={style}>
          <input
            type="radio"
            name="prompt"
            value={style}
            checked={current.prompt === style}
            onChange={() => void settings.update({ prompt: style })}
          />
          {PROMPT_LABELS[style]}
        </label>
      ))}
    </fieldset>
  );
}

type Status = { kind: 'ok'; result: ImportResult } | { kind: 'error'; message: string } | null;

function Backup() {
  const [status, setStatus] = useState<Status>(null);

  const download = async () => {
    const blob = new Blob([await exportSubscriptions()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metonic-${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    try {
      setStatus({ kind: 'ok', result: await importSubscriptions(await file.text()) });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof ImportError ? error.message : 'Import failed. Nothing was changed.',
      });
    }
  };

  return (
    <>
      <div className="actions">
        <button type="button" onClick={() => void download()}>
          Export
        </button>
        <label className="button secondary">
          Import…
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
      {status?.kind === 'error' && <p className="result warn">{status.message}</p>}
      {status?.kind === 'ok' && <ImportSummary result={status.result} />}
    </>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  const { added, updated, unchanged, invalid } = result;
  return (
    <div className="result">
      <p>
        Imported: {added} new, {updated} updated, {unchanged} already up to date.
      </p>
      {invalid.length > 0 && (
        <>
          <p className="warn">Skipped {invalid.length === 1 ? '1 invalid row' : `${invalid.length} invalid rows`}:</p>
          <ul className="muted">
            {invalid.map((row) => (
              <li key={row.index}>
                Row {row.index + 1}
                {row.name && ` (${row.name})`}: {row.error}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
