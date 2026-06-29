import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// In dev, the vibepin Vite plugin injects the real overlay (wired to the daemon).
// In the production build (the hosted landing page) there is no daemon, so load
// the overlay in DEMO mode: you can still pin/drag/annotate, and Send pops a toast.
if (import.meta.env.PROD) {
  window.__vibepinDemo = true;
  import('vibepin/overlay');
}
