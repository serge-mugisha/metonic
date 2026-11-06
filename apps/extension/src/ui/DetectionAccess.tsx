import { useCallback, useEffect, useState } from 'react';
import {
  type DetectionAccess,
  detectionAccess,
  removeAllSites,
  requestAllSites,
  requestRecipeSites,
} from '../permissions';
import { recipes } from '../recipes';

/** Current site access, refreshed whenever permissions change. `undefined` until loaded. */
export function useDetectionAccess(): DetectionAccess | undefined {
  const [access, setAccess] = useState<DetectionAccess>();
  const refresh = useCallback(() => void detectionAccess().then(setAccess), []);
  useEffect(() => {
    refresh();
    browser.permissions.onAdded.addListener(refresh);
    browser.permissions.onRemoved.addListener(refresh);
    return () => {
      browser.permissions.onAdded.removeListener(refresh);
      browser.permissions.onRemoved.removeListener(refresh);
    };
  }, [refresh]);
  return access;
}

const services = (n: number) => `${n} known service${n === 1 ? '' : 's'}`;

/** "Turn on" for known services. Clicking must call permissions.request directly (user gesture). */
export function EnableKnownServices({ access, label }: { access: DetectionAccess; label?: string }) {
  if (access.universal || access.missingServices === 0) {
    return (
      <p className="ok">✓ Checkout detection is on for {access.universal ? 'every site' : services(recipes.length)}.</p>
    );
  }
  return (
    <button type="button" onClick={() => void requestRecipeSites()}>
      {label ?? `Turn on detection for ${services(access.missingServices)}`}
    </button>
  );
}

export function AllSitesToggle({ access }: { access: DetectionAccess }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={access.universal}
        onChange={() => void (access.universal ? removeAllSites() : requestAllSites())}
      />
      <span>
        Detect subscriptions on every site, not just the {services(recipes.length)}.
        <span className="muted"> Page text is checked locally and never leaves your browser.</span>
      </span>
    </label>
  );
}

/** Settings section: status, the fix if anything is missing, and the all-sites opt-in. */
export function DetectionSettings() {
  const access = useDetectionAccess();
  if (!access) return null;
  return (
    <div className="detection-settings">
      <EnableKnownServices access={access} />
      <AllSitesToggle access={access} />
    </div>
  );
}

/** Popup nudge when known services lack access (first run skipped, or new recipes in an update). */
export function DetectionBanner() {
  const access = useDetectionAccess();
  if (!access || access.universal || access.missingServices === 0) return null;
  const all = access.missingServices === recipes.length;
  return (
    <div className="banner">
      <span>
        {all
          ? 'Checkout detection is off.'
          : `Detection is off for ${access.missingServices} newly supported service${access.missingServices === 1 ? '' : 's'}.`}
      </span>
      <button type="button" onClick={() => void requestRecipeSites()}>
        Turn on
      </button>
    </div>
  );
}
