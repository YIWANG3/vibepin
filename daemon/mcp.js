// MCP mode for the vibepin daemon (opt-in; requires @modelcontextprotocol/sdk).
// Exposes three tools over Streamable HTTP at /mcp:
//   - list_annotations    : current pending annotations (no drain)
//   - watch_annotations   : long-poll; blocks until new annotations arrive (the watch-mode loop)
//   - resolve_annotation  : mark annotation(s) done and remove from the inbox
//
// Mirrors vibe-annotations' watch_annotations loop, but the overlay it feeds is
// universal (web + Electron + pixel capture), not a Chrome extension.

import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

function buildServer(store) {
  const server = new McpServer({ name: 'vibepin', version: '0.1.0' });

  server.tool(
    'list_annotations',
    'List the current pending UI annotations (selector, note, computed styles, optional screenshot). Does not remove anything.',
    async () => {
      const items = await store.readPending();
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'watch_annotations',
    'Watch-mode loop: blocks until new UI annotations arrive, then returns them. Returns [] on timeout — call again to keep watching. After implementing each one, call resolve_annotation with its id.',
    { timeoutMs: z.number().int().positive().optional() },
    async ({ timeoutMs }) => {
      const items = await store.waitForPending(timeoutMs ?? 25000);
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'resolve_annotation',
    'Mark annotation(s) as done: remove them from the inbox and archive to processed.jsonl. Pass the ids you have implemented.',
    { ids: z.array(z.string()).min(1) },
    async ({ ids }) => {
      const resolved = await store.resolveByIds(ids);
      return { content: [{ type: 'text', text: JSON.stringify({ resolved, pending: store.size() }) }] };
    }
  );

  return server;
}

export function createMcpHandler(store) {
  const transports = Object.create(null);

  async function readJson(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!chunks.length) return undefined;
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  return async function handle(req, res) {
    const sessionId = req.headers['mcp-session-id'];

    if (req.method === 'POST') {
      const body = await readJson(req);
      let transport = sessionId ? transports[sessionId] : undefined;

      if (!transport) {
        if (!isInitializeRequest(body)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'No valid session; send initialize first' } }));
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true, // plain JSON responses (no SSE framing) — simpler + curl-testable
          onsessioninitialized: (sid) => { transports[sid] = transport; },
        });
        transport.onclose = () => { if (transport.sessionId) delete transports[transport.sessionId]; };
        await buildServer(store).connect(transport);
      }

      return transport.handleRequest(req, res, body);
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      const transport = sessionId ? transports[sessionId] : undefined;
      if (!transport) { res.writeHead(400).end('Invalid or missing session ID'); return; }
      return transport.handleRequest(req, res);
    }

    res.writeHead(405).end();
  };
}
