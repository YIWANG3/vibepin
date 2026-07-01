#!/usr/bin/env node
// vibepin CLI — resolves from the installed package, so projects reference
// it as `npx vibepin <cmd>` (no absolute paths, repo stays clean).
//
//   vibepin init [--agent <name>]                wire up the /vpin loop for an agent
//   vibepin daemon [--inbox <path>] [--port N]   start daemon (overlay + /mcp)
//   vibepin watch  [--inbox <path>]              block until inbox grows, then exit
//   vibepin claim  [--inbox <path>]              drain pending annotations as JSON
//
// Default inbox for every command: ./.vibepin/inbox.jsonl (cwd-relative).
//   --agent: claude (default) | codex | cursor | antigravity | all

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const HOME = homedir();
const [cmd, ...rest] = process.argv.slice(2);

// `init` wires the /vpin file-watcher loop into a coding agent's config. npm/npx
// can't do this — these command/prompt files live in the agent's config dir (or the
// project's), not node_modules. Each agent also gets the MCP endpoint as an
// alternative (printed, never auto-merged, so existing config is never clobbered).
if (cmd === 'init') {
  const MCP_URL = 'http://127.0.0.1:7331/mcp';

  // Copy a bundled command/prompt template to its destination; returns the dest path.
  const install = (srcRel, destDir, destName) => {
    const dest = join(destDir, destName);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(join(REPO, srcRel), dest);
    return dest;
  };

  const AGENTS = {
    claude: () => {
      const dest = install('.claude/commands/vpin.md', join(HOME, '.claude', 'commands'), 'vpin.md');
      console.log(`✓ Claude Code: installed /vpin → ${dest}`);
      console.log('  Restart Claude Code, then run /vpin in your project.');
      console.log(`  MCP alternative: claude mcp add --transport http vibepin ${MCP_URL}`);
    },
    codex: () => {
      const dest = install('adapters/commands/vpin.codex.md', join(HOME, '.codex', 'prompts'), 'vpin.md');
      console.log(`✓ Codex: installed /vpin prompt → ${dest}`);
      console.log('  Run /vpin in Codex in your project.');
      console.log('  MCP alternative — add to ~/.codex/config.toml:');
      console.log('    [mcp_servers.vibepin]');
      console.log('    command = "npx"');
      console.log(`    args = ["-y", "mcp-remote", "${MCP_URL}"]`);
    },
    cursor: () => {
      // Cursor commands & MCP are project-scoped — install into the current project.
      const dest = install('adapters/commands/vpin.cursor.md', join(process.cwd(), '.cursor', 'commands'), 'vpin.md');
      console.log(`✓ Cursor: installed /vpin command → ${dest}`);
      console.log('  Run /vpin in Cursor in this project.');
      console.log('  MCP alternative — add to .cursor/mcp.json:');
      console.log(`    { "mcpServers": { "vibepin": { "url": "${MCP_URL}" } } }`);
    },
    antigravity: () => {
      // Antigravity has no stable command-file path yet — MCP is the supported route.
      console.log('✓ Antigravity: register the MCP server (no auto-installed command).');
      console.log('  Add to Antigravity\'s MCP config (mcpServers object):');
      console.log(`    { "mcpServers": { "vibepin": { "serverUrl": "${MCP_URL}" } } }`);
      console.log('  Verify the field name (serverUrl/url) against Antigravity\'s current docs.');
      console.log('  See adapters/antigravity.md.');
    },
  };

  const i = rest.indexOf('--agent');
  const which = i >= 0 ? rest[i + 1] : 'claude';
  const names = which === 'all' ? Object.keys(AGENTS) : [which];

  if (!names.every((n) => AGENTS[n])) {
    console.error(`vibepin init: unknown --agent "${which}". Use: ${Object.keys(AGENTS).join(', ')}, all`);
    process.exit(1);
  }

  try {
    names.forEach((n) => AGENTS[n]());
    process.exit(0);
  } catch (e) {
    console.error('vibepin init failed:', e.message);
    process.exit(1);
  }
}

const TARGETS = {
  daemon: 'daemon/daemon.js',
  watch: 'daemon/watch.js',
  claim: 'daemon/claim.js',
};

if (!cmd || ['help', '-h', '--help'].includes(cmd) || !TARGETS[cmd]) {
  const known = cmd && !TARGETS[cmd] && !['help', '-h', '--help'].includes(cmd);
  if (known) console.error(`vibepin: unknown command "${cmd}"\n`);
  console.log(`vibepin <command> [options]

Commands:
  init     wire the /vpin loop into an agent (--agent claude|codex|cursor|antigravity|all)
  daemon   start the daemon (serves overlay, collects annotations, exposes /mcp)
  watch    block until the inbox gains a new annotation, then exit (wake primitive)
  claim    drain pending annotations as JSON and archive them to processed.jsonl

Options:
  --agent <name>   init only: claude (default) | codex | cursor | antigravity | all
  --inbox <path>   inbox file (default: ./.vibepin/inbox.jsonl)
  --port N         daemon only (default: 7331)`);
  process.exit(known ? 1 : 0);
}

const child = spawn(process.execPath, [join(__dirname, '..', TARGETS[cmd]), ...rest], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
