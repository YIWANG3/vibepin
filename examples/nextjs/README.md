# Next.js example (App Router)

vibepin in a Next.js app. Two dev-only pieces: `withVibepin` auto-starts the
daemon, and a `<Script>` in the layout injects the overlay.

```bash
npm install
npm run dev
```

Open http://localhost:3000, press **⌥A**, click the heading or a card, write a
note, hit **Send**. Then in a Claude Code session here run **`/vpin`**
(install once with `npx vibepin init`).

## How it's wired

- [next.config.mjs](next.config.mjs) — `export default withVibepin(nextConfig)` spawns the daemon in dev.
- [app/layout.jsx](app/layout.jsx) — dev-only `<Script src="…/annotate.js">`.
- [app/page.jsx](app/page.jsx) — a **client component** (`'use client'`) so the tree has
  React fibers; that's what lets the overlay read each element's component name.

## Component vs. source line

Next 16 ships **React 19**, which removed `_debugSource`, so annotations carry the
**component name** (e.g. `<Card>`) but not an exact `file:line`. The agent locates
the component by name. For pinpoint `file:line`, add a build plugin that stamps a
`data-source` attribute (e.g. react-dev-inspector) — the overlay reads that too.

> Tip: annotate **client components**. Pure server components have no client fiber,
> so the overlay falls back to a CSS selector for those.

`.gitignore` already covers `.vibepin/` and `.next/` at the repo root.
