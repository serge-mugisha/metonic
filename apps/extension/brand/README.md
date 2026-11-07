# Brand

The icon draws on the [Metonic cycle](https://en.wikipedia.org/wiki/Metonic_cycle): a crescent
moon inside a cycle ring, closed by a small sun. It's the moment the lunar and solar calendars
line up again, much like Metonic lines up your subscriptions with your calendar.

| File | Use |
|---|---|
| `icon.svg` | 32, 48 and 128 px, store artwork |
| `icon-16.svg` | 16 px toolbar size. The ring is dropped because it blurs at that size |
| `preview.png` | All sizes on light and dark toolbars |

Colors: indigo `#4f46e5` (the UI accent), white, and amber `#fbbf24`.

PNGs in `public/icon/` are rendered from these SVGs at exact pixel sizes with headless Chrome.
After editing an SVG, re-render them, and check `preview.png` at 16 px on both toolbars.
