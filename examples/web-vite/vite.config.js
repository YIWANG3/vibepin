import { defineConfig } from 'vite';
import vibepin from 'vibepin/vite';

// The whole integration: add the plugin. In `vite` (dev) it spawns the
// vibepin daemon pointed at this project's .vibepin/inbox.jsonl and
// injects the overlay <script> into the page. Production builds are untouched.
export default defineConfig({
  plugins: [vibepin()],
});
