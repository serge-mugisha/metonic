/**
 * The in-page "Subscribing to X? Track it" card, shown by the checkout content script.
 *
 * Plain DOM in a shadow root: page CSS can't restyle it, and the content script stays
 * small. Buttons ignore synthetic clicks (`isTrusted`), so the page can't press them.
 */

export interface PromptOptions {
  name: string;
  /** e.g. "$17.99/month · 30-day free trial" */
  details: string;
  onTrack(): Promise<void>;
  onDismiss(): Promise<void>;
}

const HOST_TAG = 'metonic-prompt';
const AUTO_CLOSE_AFTER_TRACK_MS = 4000;

const STYLE = `
:host { all: initial; }
.card {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  width: 320px; box-sizing: border-box; padding: 14px 16px;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #111827; background: #fff;
  border: 1px solid #e5e7eb; border-left: 4px solid #4f46e5; border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}
.brand { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280; }
.title { margin: 2px 0 0; font-size: 15px; font-weight: 600; }
.details { margin: 2px 0 0; color: #6b7280; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
button {
  font: inherit; padding: 5px 12px; border-radius: 6px; cursor: pointer;
  border: 1px solid #4f46e5; background: #4f46e5; color: #fff;
}
button.secondary { background: transparent; border-color: rgba(127, 127, 127, 0.4); color: #111827; }
button.close {
  position: absolute; top: 6px; right: 8px; padding: 2px 6px;
  border: 0; background: none; color: #6b7280; font-size: 16px; line-height: 1;
}
button:focus-visible { outline: 2px solid #818cf8; outline-offset: 2px; }
/* Last, so it overrides the light rules above at equal specificity. */
@media (prefers-color-scheme: dark) {
  .card { color: #f3f4f6; background: #1f2937; border-color: #374151; border-left-color: #818cf8; }
  .brand, .details, button.close { color: #9ca3af; }
  button.secondary { color: #f3f4f6; }
}
`;

export function showPrompt(options: PromptOptions): () => void {
  document.querySelector(HOST_TAG)?.remove();

  const host = document.createElement(HOST_TAG);
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;

  const card = el('div', { class: 'card', role: 'dialog', 'aria-label': 'Metonic' });
  const close = el('button', { class: 'close', type: 'button', 'aria-label': 'Close', title: 'Close' }, '×');
  const brand = el('div', { class: 'brand' }, 'Metonic');
  const title = el('p', { class: 'title' }, `Subscribing to ${options.name}?`);
  const details = el(
    'p',
    { class: 'details' },
    options.details || 'Keep track of it and get a reminder before you pay.',
  );
  const track = el('button', { type: 'button' }, 'Track it');
  const dismiss = el('button', { class: 'secondary', type: 'button' }, 'Not now');
  const actions = el('div', { class: 'actions' }, track, dismiss);
  card.append(close, brand, title, details, actions);
  root.append(style, card);
  // Outside <body> so the prompt's own text never feeds back into checkout detection.
  document.documentElement.append(host);

  const remove = () => host.remove();
  const trusted = (handler: () => void) => (event: Event) => {
    if (event.isTrusted) handler();
  };

  close.addEventListener('click', trusted(remove));
  dismiss.addEventListener(
    'click',
    trusted(() => {
      remove();
      void options.onDismiss();
    }),
  );
  track.addEventListener(
    'click',
    trusted(() => {
      track.disabled = dismiss.disabled = true;
      void options.onTrack().then(() => {
        title.textContent = `Tracking ${options.name}`;
        details.textContent = "Metonic will remind you before it's charged.";
        actions.remove();
        setTimeout(remove, AUTO_CLOSE_AFTER_TRACK_MS);
      });
    }),
  );

  return remove;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}
