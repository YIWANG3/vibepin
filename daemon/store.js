// Shared inbox operations, used by daemon.js and the MCP layer.
// The file/CLI path (claim.js, watch.js) stays independent and zero-dep.

import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

export function resolveInbox(argv = process.argv, env = process.env) {
  const i = argv.indexOf('--inbox');
  return resolve(
    i !== -1 ? argv[i + 1]
      : env.ANNOTATE_INBOX || join(process.cwd(), '.vibepin', 'inbox.jsonl')
  );
}

export function createStore(INBOX) {
  const PROCESSED = join(dirname(INBOX), 'processed.jsonl');

  async function readPending() {
    try {
      const txt = await readFile(INBOX, 'utf8');
      return txt.split('\n').filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch { return { raw: l }; }
      });
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  function size() {
    try { return statSync(INBOX).size; } catch { return 0; }
  }

  async function append(items) {
    await mkdir(dirname(INBOX), { recursive: true });
    await appendFile(INBOX, items.map((i) => JSON.stringify(i)).join('\n') + '\n', 'utf8');
  }

  // Remove specific annotations by id, archiving them to processed.jsonl.
  async function resolveByIds(ids) {
    const set = new Set(ids);
    const items = await readPending();
    const keep = [], done = [];
    for (const it of items) (set.has(it.id) ? done : keep).push(it);
    await mkdir(dirname(INBOX), { recursive: true });
    if (done.length) await appendFile(PROCESSED, done.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');
    await writeFile(INBOX, keep.length ? keep.map((k) => JSON.stringify(k)).join('\n') + '\n' : '', 'utf8');
    return done.length;
  }

  // Long-poll: resolve immediately if anything is pending, else block until the
  // inbox grows or the timeout elapses (returns [] on timeout so the caller loops).
  function waitForPending(timeoutMs = 25000) {
    return new Promise(async (res) => {
      const existing = await readPending();
      if (existing.length) return res(existing);
      const start = size();
      let done = false;
      const finish = async (val) => { if (done) return; done = true; clearInterval(iv); clearTimeout(to); res(val ?? await readPending()); };
      const iv = setInterval(() => { if (size() > start) finish(); }, 400);
      const to = setTimeout(() => finish([]), timeoutMs);
    });
  }

  return { INBOX, PROCESSED, readPending, size, append, resolveByIds, waitForPending };
}
