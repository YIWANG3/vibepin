# Web example (Vite, the devDependency path)

Shows the lowest-friction integration for a project you own: add one plugin.

```bash
npm install      # pulls vite + vibepin (file:../..)
npm run dev      # vite spawns the daemon AND injects the overlay
```

Open the printed URL (e.g. http://localhost:5173). Then:

1. Press **Alt+A** → annotate mode on.
2. Hover/click any card, button, or heading → type a note → **Add**.
3. Bottom-right panel → **Send**. Annotations land in `.vibepin/inbox.jsonl`.

The only integration code is in [vite.config.js](vite.config.js):

```js
import vibepin from 'vibepin/vite';
export default defineConfig({ plugins: [vibepin()] });
```

In real use you'd `npm i -D vibepin` instead of the `file:../..` link.

## The Claude Code side

In a Claude Code session rooted here, give it the standing instruction:

> Background-run `../../daemon/watch.js --inbox $PWD/.vibepin/inbox.jsonl`;
> when it exits run `../../daemon/claim.js --inbox $PWD/.vibepin/inbox.jsonl`,
> apply each annotation, then re-arm the watcher.
