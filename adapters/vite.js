// Vite plugin — the "devDependency" distribution.
// In dev it (1) spawns the vibepin daemon pointed at the project root's
// inbox, and (2) injects the overlay <script> into every served HTML page.
// Production builds are untouched.
//
//   // vite.config.js
//   import vibepin from 'vibepin/vite'
//   export default { plugins: [vibepin()] }
//
// Options: { port=7331, inbox=<root>/.vibepin/inbox.jsonl, enabled=dev-only }

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function vibepin(opts = {}) {
  const port = opts.port || 7331;
  let proc = null;

  return {
    name: 'vibepin',
    apply: 'serve', // dev only
    configResolved(config) {
      if (opts.enabled === false) return;
      const inbox = resolve(opts.inbox || join(config.root, '.vibepin', 'inbox.jsonl'));
      const daemon = join(__dirname, '..', 'daemon', 'daemon.js');
      proc = spawn(process.execPath, [daemon, '--inbox', inbox], {
        stdio: 'inherit',
        env: { ...process.env, ANNOTATE_PORT: String(port) },
      });
      const kill = () => proc && proc.kill();
      process.on('exit', kill);
      process.on('SIGINT', () => { kill(); process.exit(0); });
    },
    transformIndexHtml(html) {
      if (opts.enabled === false) return html;
      return {
        html,
        tags: [{
          tag: 'script',
          attrs: { src: `http://127.0.0.1:${port}/annotate.js`, defer: true },
          injectTo: 'body',
        }],
      };
    },
    closeBundle() { if (proc) proc.kill(); },
  };
}
