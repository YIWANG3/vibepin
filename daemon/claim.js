#!/usr/bin/env node
// Atomically claim all pending annotations:
//   1. rename inbox.jsonl -> inbox.claiming (so new POSTs start a fresh inbox)
//   2. append claimed lines to processed.jsonl (audit trail)
//   3. print the claimed batch as a JSON array on stdout
//
// Claude Code runs `node claim.js` after the watcher wakes it, parses stdout,
// applies the edits, then re-arms the watcher. Truncation happens only while
// the watcher is NOT running, so there is no race.

import { readFile, rename, appendFile, unlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';

const inboxArgIdx = process.argv.indexOf('--inbox');
const INBOX = resolve(
  inboxArgIdx !== -1 ? process.argv[inboxArgIdx + 1]
    : process.env.ANNOTATE_INBOX || join(process.cwd(), '.vibepin', 'inbox.jsonl')
);
const CLAIMING = INBOX + '.claiming';
const PROCESSED = join(dirname(INBOX), 'processed.jsonl');

async function main() {
  let raw = '';
  try {
    await rename(INBOX, CLAIMING);
    raw = await readFile(CLAIMING, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      process.stdout.write('[]\n');
      return;
    }
    throw e;
  }

  const lines = raw.split('\n').filter(Boolean);
  const items = lines.map((l) => {
    try { return JSON.parse(l); } catch { return { raw: l }; }
  });

  if (lines.length) await appendFile(PROCESSED, lines.join('\n') + '\n', 'utf8');
  await unlink(CLAIMING).catch(() => {});

  process.stdout.write(JSON.stringify(items, null, 2) + '\n');
}

main().catch((e) => {
  process.stderr.write(String(e.stack || e) + '\n');
  process.exit(1);
});
