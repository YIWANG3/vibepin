#!/usr/bin/env node
// vibepin daemon
// - GET  /annotate.js   -> serves the framework-agnostic overlay (live from disk)
// - POST /annotations   -> appends a batch to <inbox> as JSONL
// - GET  /              -> a self-contained demo page that loads the overlay
// - GET  /health        -> { ok, inbox, pending }
//
// Bound to 127.0.0.1 only. Inbox path is resolved once at startup so the
// Claude Code watcher knows exactly which file to wake on.

import http from 'node:http';
import { readFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { resolveInbox, createStore } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.ANNOTATE_PORT || 7331);
const HOST = '127.0.0.1';
// Inbox lives next to whatever project the daemon serves. Override with
// ANNOTATE_INBOX (absolute) or --inbox <path>; default ./.vibepin/inbox.jsonl
const INBOX = resolveInbox();
const store = createStore(INBOX);
const OVERLAY = join(__dirname, '..', 'core', 'annotate.js');

// MCP mode is opt-in: it needs @modelcontextprotocol/sdk. If that isn't
// installed, the daemon still runs in plain file mode (watch.js / claim.js).
let mcpHandler = null;
try {
  const { createMcpHandler } = await import('./mcp.js');
  mcpHandler = createMcpHandler(store);
} catch (e) {
  mcpHandler = null;
  if (process.env.ANNOTATE_DEBUG) console.log('[vibepin] MCP mode off:', e.message);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function readBody(req, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('payload too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function countPending() {
  try {
    const txt = await readFile(INBOX, 'utf8');
    return txt.split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const send = (code, body, type = 'application/json') =>
    res.writeHead(code, { ...CORS, 'Content-Type': type }).end(body);

  // MCP transport owns its own request/response lifecycle — route it first.
  if (url.pathname === '/mcp') {
    if (!mcpHandler) return send(503, JSON.stringify({ error: 'MCP mode not enabled — run `npm install` in vibepin' }));
    try { return await mcpHandler(req, res); }
    catch (e) { if (!res.headersSent) send(500, JSON.stringify({ error: String(e.message || e) })); return; }
  }

  if (req.method === 'OPTIONS') return send(204, '');

  try {
    if (req.method === 'GET' && url.pathname === '/annotate.js') {
      const js = await readFile(OVERLAY, 'utf8');
      // never cache the overlay — a plain reload should always get the latest
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(js);
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(200, JSON.stringify({ ok: true, inbox: INBOX, pending: await countPending() }));
    }

    if (req.method === 'POST' && url.pathname === '/annotations') {
      const raw = await readBody(req);
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : Array.isArray(data.annotations) ? data.annotations : [data];
      if (!items.length) return send(400, JSON.stringify({ error: 'no annotations' }));
      await mkdir(dirname(INBOX), { recursive: true });
      const now = Date.now();
      const lines = items.map((a, i) =>
        JSON.stringify({
          id: a.id || `${now}-${i}`,
          ts: a.ts || now,
          url: a.url || '',
          note: a.note || '',
          kind: a.kind || 'element',          // 'element' | 'region'
          selector: a.selector || '',
          component: a.component || null,      // React component name (dev builds)
          source: a.source || null,           // source file:line (dev builds)
          elements: a.elements || null,       // region mode: sampled elements
          rect: a.rect || null,
          html: a.html || '',
          styles: a.styles || null,
          screenshot: a.screenshot || null,
        })
      );
      await appendFile(INBOX, lines.join('\n') + '\n', 'utf8');
      return send(200, JSON.stringify({ ok: true, received: items.length, pending: await countPending() }));
    }

    if (req.method === 'GET' && url.pathname === '/') {
      return send(
        200,
        `<!doctype html><html><head><meta charset="utf-8"><title>vibepin demo</title>
<style>body{margin:0;background:#111;color:#eee;font:14px system-ui;padding:40px}
.card{background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:20px;max-width:520px;margin:14px 0}
button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}
h1{font-size:18px;margin:0 0 6px}.muted{color:#888}</style></head>
<body><h1>vibepin · demo</h1>
<p class="muted">Press <b>⌥A</b> (Option+A on Mac) / <b>Alt+A</b> to toggle annotate mode, hover an element, click it, type a note, then Send.</p>
<div class="card"><h1>A sample card</h1><p class="muted">Annotate this heading, this paragraph, or the button below.</p>
<button id="cta">A button</button></div>
<div class="card"><h1>Another block</h1><p>Whatever you click gets a CSS selector, outerHTML, computed styles and your note posted to the inbox.</p></div>
<script src="/annotate.js"></script></body></html>`,
        'text/html; charset=utf-8'
      );
    }

    return send(404, JSON.stringify({ error: 'not found' }));
  } catch (e) {
    return send(500, JSON.stringify({ error: String(e.message || e) }));
  }
});

server.on('error', (e) => {
  // Already running (e.g. another dev server spawned it) — not an error.
  if (e.code === 'EADDRINUSE') {
    console.log(`[vibepin] daemon already running on ${HOST}:${PORT} — reusing it`);
    process.exit(0);
  }
  console.error('[vibepin] daemon error:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  if (!existsSync(dirname(INBOX))) await mkdir(dirname(INBOX), { recursive: true }).catch(() => {});
  console.log(`[vibepin] daemon  http://${HOST}:${PORT}`);
  console.log(`[vibepin] overlay http://${HOST}:${PORT}/annotate.js`);
  console.log(`[vibepin] inbox   ${INBOX}`);
  console.log(mcpHandler
    ? `[vibepin] MCP     http://${HOST}:${PORT}/mcp  (tools: list/watch/resolve_annotations)`
    : `[vibepin] MCP     off — run \`npm install\` in vibepin to enable /mcp`);
});
