const { contextBridge, ipcRenderer } = require('electron');

// The overlay calls window.__vibepinCapture(rect) if present, and attaches the
// returned data URL to the annotation. This gives pixel-perfect crops that a
// plain browser page cannot produce.
contextBridge.exposeInMainWorld('__vibepinCapture', (rect) =>
  ipcRenderer.invoke('annotate:capture', rect)
);
