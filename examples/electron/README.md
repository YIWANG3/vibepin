# Electron example (injection + pixel-perfect capture)

Shows the Electron integration: inject the overlay in dev and expose
`window.__vibepinCapture` so annotations carry real screenshots.

```bash
npm install      # pulls electron
npm run dev      # main.js spawns the daemon and opens the window (npm start also works)
```

Then in the window:

1. Press **Alt+A** → annotate mode on.
2. Click any card/button/heading → type a note → **Add** (the crop is captured via `capturePage`).
3. Bottom-right panel → **Send** → annotations land in `.vibepin/inbox.jsonl`.

Integration lives in three small pieces, all dev-gated by `!app.isPackaged`:

- [main.js](main.js) — spawns the daemon (Electron-as-Node, no system node needed),
  injects `http://127.0.0.1:7331/annotate.js` after load, and handles `annotate:capture`
  with `webContents.capturePage(rect)`.
- [preload.js](preload.js) — `contextBridge.exposeInMainWorld('__vibepinCapture', …)`.
- [index.html](index.html) — plain UI; knows nothing about vibepin.

## The Claude Code side

Same as the web example — point the watcher at this folder's inbox:

> Background-run `../../daemon/watch.js --inbox $PWD/.vibepin/inbox.jsonl`;
> on exit run `../../daemon/claim.js --inbox $PWD/.vibepin/inbox.jsonl`,
> apply each annotation (these include a `screenshot` data URL), then re-arm.
