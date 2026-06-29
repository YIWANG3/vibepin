// vibepin/next — wrap your Next.js config so the daemon auto-starts in dev.
// Next has no Vite-style HTML transform, so the overlay <script> is added in your
// root layout (dev only) — see adapters/nextjs.md. This just spawns the daemon.
//
//   // next.config.mjs
//   import withVibepin from 'vibepin/next'
//   export default withVibepin({ /* your next config */ })
//
// Options: { port = 7331 }

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
let started = false;

export default function withVibepin(nextConfig = {}, opts = {}) {
  const isDev = process.env.NODE_ENV !== 'production';
  // guard: config can be evaluated more than once per process
  if (isDev && !started && !process.env.__VIBEPIN_DAEMON) {
    started = true;
    process.env.__VIBEPIN_DAEMON = '1';
    const daemon = join(__dirname, '..', 'daemon', 'daemon.js');
    const child = spawn(process.execPath, [daemon], {
      env: { ...process.env, ANNOTATE_PORT: String(opts.port || 7331) },
      stdio: 'inherit',
    });
    child.unref?.();
    const kill = () => { try { child.kill(); } catch { /* ignore */ } };
    process.on('exit', kill);
    process.on('SIGINT', () => { kill(); process.exit(0); });
  }
  return nextConfig;
}
