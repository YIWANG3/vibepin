# Cursor integration

vibepin's core is agent-agnostic: a daemon collects annotations into
`.vibepin/inbox.jsonl`, and any agent picks them up over one of two interchangeable
transports — a **token-cheap file-watcher loop** or the **MCP** `watch_annotations`
tool. Cursor supports both, and its native HTTP MCP makes Route B especially clean.

## 0. Prereqs (same for every agent)

1. Install vibepin in your project: `npm i -D vibepin`.
2. Inject the overlay in dev — Vite plugin, `withVibepin` for Next.js, or the
   standalone daemon + `<script>` tag. See the [README](../README.md) and the
   per-framework adapters.
3. Add `.vibepin/` to `.gitignore`.

## Route A — file-watcher loop (recommended, token-cheap)

Cursor's custom commands are project-scoped, so run this **in your project root**:

```bash
npx vibepin init --agent cursor     # writes .cursor/commands/vpin.md
```

Then in Cursor's Agent, run **`/vpin`**. It loops: `npx vibepin watch` (blocks until
the inbox grows — **no model tokens spent while it blocks**) → `npx vibepin claim`
(drains the batch as JSON) → edits the right files → re-arms. React annotations carry
the component name + `file:line`.

## Route B — MCP (native HTTP)

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "vibepin": { "url": "http://127.0.0.1:7331/mcp" }
  }
}
```

Settings → MCP should show **vibepin** green. Then tell the Agent **"watch vibepin
annotations"**. Tools: `watch_annotations` (long-poll), `list_annotations`,
`resolve_annotation`.

## Which to use

- **Route A** is token-cheap: the wait happens in the terminal, not the model.
- **Route B** long-polls, so the agent keeps spending tokens while idle — fine for
  fully hands-free, worse for cost. Needs `npm install` (pulls the MCP SDK).

Both read the same `.vibepin/inbox.jsonl`.
