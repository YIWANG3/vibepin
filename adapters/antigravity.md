# Antigravity (Google) integration

vibepin's core is agent-agnostic: a daemon collects annotations into
`.vibepin/inbox.jsonl`, and any agent picks them up over the **MCP**
`watch_annotations` tool or a **file-watcher loop**. Antigravity is an agentic IDE
with MCP support, so MCP is the supported route here.

## 0. Prereqs (same for every agent)

1. Install vibepin in your project: `npm i -D vibepin`.
2. Inject the overlay in dev — Vite plugin, `withVibepin` for Next.js, or the
   standalone daemon + `<script>` tag. See the [README](../README.md) and the
   per-framework adapters.
3. Add `.vibepin/` to `.gitignore`.

## Route A — MCP (recommended for Antigravity)

Register vibepin's HTTP `/mcp` endpoint in Antigravity's MCP config (the
`mcpServers` object):

```json
{
  "mcpServers": {
    "vibepin": { "serverUrl": "http://127.0.0.1:7331/mcp" }
  }
}
```

> Antigravity is new and its config schema is still moving. Field names
> (`serverUrl` vs `url`) and whether HTTP is supported directly may differ from the
> snippet above — check Antigravity's current MCP docs. If only stdio is supported,
> bridge with `mcp-remote`:
> `{ "command": "npx", "args": ["-y", "mcp-remote", "http://127.0.0.1:7331/mcp"] }`.

Then ask the agent to **"start watching vibepin"**. Tools: `watch_annotations`
(long-poll), `list_annotations`, `resolve_annotation`. After implementing each one
it calls `resolve_annotation` with the id. Needs `npm install` (pulls the MCP SDK).

## Route B — file-watcher loop (token-cheap)

If Antigravity lets you save a reusable workflow/rule or run shell commands in a
loop, you can drive the token-cheap path manually — the same loop the `/vpin`
commands automate for other agents:

1. `npx vibepin watch` — blocks until a new annotation arrives (no model tokens spent
   while it blocks), then exits.
2. `npx vibepin claim` — prints the pending annotations as JSON; implement each
   (`element` → `component`/`source`; `region` → `rect`/`elements`).
3. Repeat.

## Which to use

- **Route A (MCP)** is the path Antigravity supports natively today, but it long-polls
  — the agent keeps spending tokens while idle.
- **Route B** is token-cheap (the wait is in the shell) but depends on Antigravity
  being able to run a blocking command in a loop.

Both read the same `.vibepin/inbox.jsonl`.
