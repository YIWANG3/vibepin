---
description: vibepin · start the token-cheap file-watcher loop in this project
---
Watch this project's vibepin inbox and implement annotations as they arrive — the
token-cheap way. Do NOT call the `watch_annotations` MCP tool (it polls and burns
tokens while idle).

Prerequisite: this project has vibepin installed, so `npx vibepin` resolves.

Do this, then loop:

1. Launch in the BACKGROUND (run_in_background: true); do not block this turn:
   `npx vibepin watch`
   (it watches `./.vibepin/inbox.jsonl` by default). Once it is running, end the turn
   and hand control back to me.

2. When that background process exits (a new annotation arrived), run:
   `npx vibepin claim`
   It prints a JSON array — implement each annotation:
   - `kind: "element"` → prefer `component` + `source` (React) to open the right file;
     otherwise use `selector` / `html` / `styles`.
   - `kind: "region"` → use `rect` + `elements` (the components inside the box).
   Briefly say what you changed and which files.

3. Re-launch step 1 (`npx vibepin watch`) in the background, then end the turn.

While the watcher is blocking you are idle and spend no tokens. I may type other
(non-UI) requests in the meantime — handle them normally, then make sure the watcher
is still armed (re-launch if needed).

To stop: kill the background watch task.

> Distributed copy. To use `/vpin` in any project, run `npx vibepin init` (it copies
> this into `~/.claude/commands/`). Your project only needs `npm i -D vibepin`.
