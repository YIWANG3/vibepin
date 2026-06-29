#!/usr/bin/env node
// Block until the inbox gains new annotations, then exit 0.
// This is the "wake primitive": Claude Code launches it as a background task;
// when it exits, the harness re-invokes the agent in the same session.
//
// Zero external deps (no fswatch needed) — uses fs.watchFile polling, which is
// reliable across editors/atomic-rename writers where fs.watch can miss events.

import { statSync } from 'node:fs';
import { watchFile, unwatchFile } from 'node:fs';
import { resolve, join } from 'node:path';

const inboxArgIdx = process.argv.indexOf('--inbox');
const INBOX = resolve(
  inboxArgIdx !== -1 ? process.argv[inboxArgIdx + 1]
    : process.env.ANNOTATE_INBOX || join(process.cwd(), '.vibepin', 'inbox.jsonl')
);
const TIMEOUT_MS = Number(process.env.ANNOTATE_WATCH_TIMEOUT || 0); // 0 = no timeout

function size() {
  try { return statSync(INBOX).size; } catch { return 0; }
}

const start = size();

function done(reason) {
  unwatchFile(INBOX);
  console.log(`[vibepin] wake: ${reason}`);
  process.exit(0);
}

watchFile(INBOX, { interval: 400 }, (curr) => {
  if (curr.size > start) done(`inbox grew ${start}→${curr.size} bytes`);
});

if (TIMEOUT_MS > 0) {
  setTimeout(() => done(`timeout after ${TIMEOUT_MS}ms (re-arm)`), TIMEOUT_MS);
}

console.log(`[vibepin] watching ${INBOX} (from ${start} bytes) …`);
