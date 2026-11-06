import { useEffect, useState } from 'react';
import { recipes } from '../recipes';

const ALL_SITES = '<all_urls>';

export function UniversalDetectionToggle() {
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
      <span>
        Detect subscriptions on every site, not just the {recipes.length} known services.
        <span className="muted"> Page text is checked locally and never leaves your browser.</span>
      </span>
    </label>
  );
}
