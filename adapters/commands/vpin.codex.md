# vpin — vibepin file-watcher loop (Codex)

Watch this project's vibepin inbox and implement UI annotations as they arrive —
the token-cheap way. Do NOT use the `watch_annotations` MCP tool; it long-polls and
burns tokens while idle. This loop blocks in the shell instead, so no model tokens
are spent while you wait.

Prerequisite: vibepin is installed in this project, so `npx vibepin` resolves.

Loop, starting now:

1. Run this and wait for it — it blocks until a new annotation arrives, then exits:
   `npx vibepin watch`
   (watches `./.vibepin/inbox.jsonl` by default). No tokens are spent while it blocks.

2. When it returns, run:
   `npx vibepin claim`
   It prints a JSON array — implement each annotation:
   - `kind: "element"` → prefer `component` + `source` (React) to open the right file;
     otherwise use `selector` / `html` / `styles`.
   - `kind: "region"` → use `rect` + `elements` (the components inside the box).
   Say briefly what you changed and which files. (`claim` already archives them to
   `processed.jsonl` — there is no separate resolve step.)

3. Go back to step 1.

Stop when I interrupt you.
