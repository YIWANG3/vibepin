# Codex (OpenAI Codex CLI) integration

vibepin's core is agent-agnostic: a daemon collects annotations into
`.vibepin/inbox.jsonl`, and any agent picks them up over one of two interchangeable
transports — a **token-cheap file-watcher loop** or the **MCP** `watch_annotations`
tool. Codex supports both.

## 0. Prereqs (same for every agent)

1. Install vibepin in your project: `npm i -D vibepin`.
2. Inject the overlay in dev — Vite plugin, `withVibepin` for Next.js, or the
   standalone daemon + `<script>` tag. See the [README](../README.md) and the
   per-framework adapters.
3. Add `.vibepin/` to `.gitignore`.

## Route A — file-watcher loop (recommended, token-cheap)

```bash
npx vibepin init --agent codex      # writes ~/.codex/prompts/vpin.md
```

Then in a Codex session at your project root, run **`/vpin`**. It loops:
`npx vibepin watch` (blocks until the inbox grows — **no model tokens spent while it
blocks**) → `npx vibepin claim` (drains the batch as JSON) → edits the right files →
re-arms. React annotations carry the component name + `file:line`, so it opens the
correct source.

## Route B — MCP

Codex's MCP servers launch over stdio, so bridge vibepin's HTTP `/mcp` with
`mcp-remote`. Add to `~/.codex/config.toml`:

```toml
[mcp_servers.vibepin]
command = "npx"
args = ["-y", "mcp-remote", "http://127.0.0.1:7331/mcp"]
```

(If your Codex build supports HTTP MCP natively, point it straight at the URL and
drop `mcp-remote`.) Then tell Codex **"start watching vibepin"**. Tools:
`watch_annotations` (long-poll), `list_annotations`, `resolve_annotation`.

## Which to use

- **Route A** is token-cheap: the wait happens in the shell, not the model.
- **Route B** long-polls, so the agent keeps spending tokens while idle — fine for
  fully hands-free, worse for cost. Needs `npm install` (pulls the MCP SDK).

Both read the same `.vibepin/inbox.jsonl`.
