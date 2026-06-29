# React example (component-aware annotations)

Same one-plugin integration, but on a React app — so annotations carry the
**component name** and **source file:line**, not just a CSS selector.

```bash
npm install
npm run dev      # vite + react + vibepin daemon, all in one
```

Open the printed URL. Then:

1. **⌥A** (Option+A) → annotate mode.
2. **Click** an element (`Card`, a `Toolbar` button, the `<h1>`) — the popup
   shows e.g. `<Card> src/components/Card.jsx:5`.
3. **Drag** a box over several cards — captures the area + the components inside it.
4. Type a note → **Add** → **Send**.

(Click = element, drag = region. No mode switch.)

Because annotations carry `component` + `source`, Claude Code edits the right
component file directly (`src/components/Card.jsx`) instead of guessing from
a selector.

## How the source info is obtained

`@vitejs/plugin-react` enables React's JSX dev transform, which attaches
`_debugSource` (file + line) to each element's fiber. The overlay reads it via
the fiber on the DOM node. For React 19 (where `_debugSource` was removed) or
non-Vite setups, the overlay also reads a `data-source` attribute if a dev
inspector plugin stamps one — so the same payload shape works either way.

## Claude Code side

> Background-run `../../daemon/watch.js --inbox $PWD/.vibepin/inbox.jsonl`;
> on exit run `../../daemon/claim.js --inbox $PWD/.vibepin/inbox.jsonl`,
> apply each annotation (use its `source`/`component` to open the right file), re-arm.

Or use MCP watch mode (see the root README).
