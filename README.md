# vibepin

**Drop a pin on any UI, write what to change — your AI coding agent edits the source.**

In-browser visual annotation → local inbox → your agent picks it up and applies the change.
No screenshots, no copy-paste, no describing *which* element. Works on any Chromium page —
a web dev server **or** an Electron renderer — with React component + `file:line` detection.

- **Pin** an element or **drag a box** over a region, type a note, hit **Send**.
- Your agent drains the queue and edits the right file (React → component name + source line).
- Two pickup modes: a **zero-dep file watcher**, or an **MCP** `watch_annotations` tool.
- Fully local. No cloud, no account, no API key.

Works with **Claude Code** out of the box; any MCP-capable agent via the MCP tools.

> 🚀 第一次用?看 **[上手指南 GETTING_STARTED.md](GETTING_STARTED.md)**(5 分钟跑通,中文)。
> Below: architecture & reference.

```
[any page] annotate.js  ──POST──►  daemon :7331  ──►  .vibepin/inbox.jsonl
   Alt+A, click, note                                        │ new annotation
                                                              ▼
   Claude Code waits on it, two interchangeable ways:
     A) MCP   : watch_annotations (long-poll) → returns → edit → resolve → loop
     B) file  : watch.js (blocks) → wakes → claim.js → edit → re-arm → loop
```

The architecture constraint this respects: an MCP server / browser extension can
**never push** an agent turn — the agent (client) must initiate. So the wake is
always agent-side: either it parks in `watch_annotations` (MCP long-poll, same
pattern as vibe-annotations) or in a background `watch.js` that exits on change
and lets the harness re-invoke the agent. Same loop, two transports.

## Distribution (pick per target)

| Target | How to inject the overlay |
|---|---|
| **Owned web project** (Vite) | `devDependency` → `import vibepin from 'vibepin/vite'` — auto-spawns daemon + injects script in dev |
| **Electron app** | dev-only `executeJavaScript` loader + optional pixel-perfect capture — see [adapters/electron.md](adapters/electron.md) |
| **Any page / not yours** | `<script src="http://127.0.0.1:7331/annotate.js">`, a bookmarklet, or a thin browser extension that injects the same line |

The overlay (`core/annotate.js`) is one file, identical everywhere. Only the
injection vector differs.

## Quick start (standalone, no project needed)

```bash
node daemon/daemon.js                 # serves overlay + demo + collects annotations
open http://127.0.0.1:7331/           # demo page; press Alt+A, click, type, Send
```

## Runnable examples

- [examples/web-vite](examples/web-vite) — plain browser project; integration is one
  Vite plugin that auto-spawns the daemon and injects the overlay. `npm install && npm run dev`.
- [examples/react-vite](examples/react-vite) — React app; annotations carry the
  **component name + source file:line** (not just a selector). `npm install && npm run dev`.
- [examples/electron](examples/electron) — Electron app; main.js injects the overlay
  in dev and exposes `capturePage` for pixel-perfect crops. `npm install && npm start`.

## Two gestures — no mode switch

- **Click** an element → element annotation. Hover-highlights first. On React dev
  builds the payload includes `component` + `source` (from the fiber's `_debugSource`,
  or a `data-source` attribute fallback for React 19 / inspector plugins).
- **Drag** a box (>5px) → region annotation. Captures the box `rect` and the
  `elements` (with components) inside it. For "this whole row is cramped" feedback
  that isn't a single node.

Shortcuts: **⌥A / Alt+A** toggle · **Esc** exit.

## The Claude Code loop — two ways

### A) MCP watch mode (recommended)

Like vibe-annotations' "start watching", but the overlay it feeds is universal
(web + Electron + pixel capture), not a Chrome extension. Needs `npm install`
(pulls `@modelcontextprotocol/sdk`); the daemon then serves `/mcp`.

```bash
claude mcp add --transport http vibepin http://127.0.0.1:7331/mcp
```

Then tell Claude Code **“start watching vibepin”**. It calls the tools in a loop:

- `watch_annotations` — long-polls; blocks until new annotations arrive, returns them (`[]` on timeout → call again).
- `list_annotations` — current pending, no drain.
- `resolve_annotation { ids }` — mark done, remove from inbox, archive to `processed.jsonl`.

### B) File watcher (zero-dep, no MCP)

If you'd rather not register an MCP server, the daemon runs in plain file mode too:

> Background-run `node <vibepin>/daemon/watch.js --inbox <repo>/.vibepin/inbox.jsonl`.
> When it exits, run `node <vibepin>/daemon/claim.js --inbox <same>`, apply each
> annotation, then re-arm `watch.js`. Repeat.

- `watch.js` — blocks until inbox grows, then exits 0 (the wake primitive). Zero deps, no `fswatch`.
- `claim.js` — atomically drains the inbox, archives to `processed.jsonl`, prints the batch as JSON.

Both modes read the same `.vibepin/inbox.jsonl`, so you can use either.

## Overlay UX

- **Alt+A** toggle. Hover highlights; the tag shows `tag#id.class`.
- Click → popup with the resolved CSS selector → type a note → **Add** (or ⌘/Ctrl+Enter).
- Bottom-right panel batches them; **Send** POSTs the batch. **Esc** exits.
- Each annotation carries: `selector`, `rect`, truncated `outerHTML`, a curated
  `getComputedStyle` subset, `note`, `url`, and (if `window.__vibepinCapture` exists) a screenshot.

## Notes

- Daemon binds `127.0.0.1` only. Inbox path is fixed at startup so the watcher is unambiguous.
- One daemon serves many pages; point it at the inbox of whichever repo Claude Code is editing.
- No agent self-verification by design — you stay the aesthetic judge; the loop only removes the handoff friction.
