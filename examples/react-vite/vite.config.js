import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vibepin from 'vibepin/vite';

// react() enables the JSX dev transform, which stamps each element's fiber with
// _debugSource (file + line). vibepin's overlay reads that, so annotations
// on this app carry the component name and source file:line — no extra config.
export default defineConfig({
  plugins: [react(), vibepin()],
});
