import { recipes } from '../../src/recipes';
import { AllSitesToggle, EnableKnownServices, useDetectionAccess } from '../../src/ui/DetectionAccess';

export function App() {
  const access = useDetectionAccess();

  return (
    <main>
      <h1>Welcome to Metonic</h1>
      <p className="lead">
        Metonic notices when you sign up for a subscription, keeps all of them in one list, and reminds you before a
        free trial turns into a charge.
      </p>

      <ol className="steps">
        <li>
          <h2>Turn on checkout detection</h2>
          <p>
            To spot a checkout, Metonic reads the pages of the {recipes.length} services it knows, such as{' '}
            {recipes
              .slice(0, 3)
              .map((r) => r.name)
              .join(', ')}
            . Chrome will ask you to allow that. Pages are checked inside your browser. Nothing is sent anywhere, and
            Metonic has no server or account.
          </p>
          {access && <EnableKnownServices access={access} />}
        </li>
        <li>
          <h2>Optional: every site</h2>
          <p>Catch subscriptions on services Metonic doesn't know yet. You can change this any time in Settings.</p>
          {access && <AllSitesToggle access={access} />}
        </li>
        <li>
          <h2>Pin Metonic</h2>
          <p>Click the puzzle-piece icon in Chrome's toolbar, then the pin next to Metonic.</p>
        </li>
      </ol>

      <p className="muted">
        Prefer not to allow any sites? You can still add subscriptions by hand, or open Metonic on a checkout page and
        use "Track this page".
      </p>
    </main>
  );
}
