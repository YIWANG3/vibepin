#!/usr/bin/env node
// vibepin CLI — resolves from the installed package, so projects reference
// it as `npx vibepin <cmd>` (no absolute paths, repo stays clean).
//
//   vibepin daemon [--inbox <path>] [--port N]   start daemon (overlay + /mcp)
//   vibepin watch  [--inbox <path>]              block until inbox grows, then exit
//   vibepin claim  [--inbox <path>]              drain pending annotations as JSON
//
// Default inbox for every command: ./.vibepin/inbox.jsonl (cwd-relative).

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);

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
  daemon   start the daemon (serves overlay, collects annotations, exposes /mcp)
  watch    block until the inbox gains a new annotation, then exit (wake primitive)
  claim    drain pending annotations as JSON and archive them to processed.jsonl

Options:
  --inbox <path>   inbox file (default: ./.vibepin/inbox.jsonl)
  --port N         daemon only (default: 7331)`);
  process.exit(known ? 1 : 0);
}

const child = spawn(process.execPath, [join(__dirname, '..', TARGETS[cmd]), ...rest], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
