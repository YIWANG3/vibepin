# Electron integration

The renderer is just a Chromium page, so the same overlay works. Two extras
Electron can do that a plain browser cannot:

1. **Inject without touching your HTML** — load the overlay in dev only.
2. **Pixel-perfect element screenshots** via `webContents.capturePage(rect)`,
   exposed to the page as `window.__vibepinCapture(rect)`.

## Main process (dev only)

```js
// after mainWindow is created, in dev:
if (!app.isPackaged) {
  const PORT = 7331;
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      (function(){
        var s=document.createElement('script');
        s.src='http://127.0.0.1:${PORT}/annotate.js';
        document.body.appendChild(s);
      })();
    `);
  });

  // pixel-perfect crop for annotations
  const { ipcMain } = require('electron');
  ipcMain.handle('annotate:capture', async (_e, rect) => {
    const img = await mainWindow.webContents.capturePage(rect);
    return img.toDataURL();
  });
}
```

## Preload (dev only)

```js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('__vibepinCapture', (rect) =>
  ipcRenderer.invoke('annotate:capture', rect)
);
```

Start the daemon pointed at the app's repo so Claude Code watches the right inbox:

```bash
node /Users/yiwang/Desktop/workspace/vibepin/daemon/daemon.js \
  --inbox /Users/yiwang/Desktop/workspace/media-resource-management/.vibepin/inbox.jsonl
```

(The Vite-plugin path auto-spawns the daemon; for Electron run it yourself or
add an equivalent spawn in your dev bootstrap.)
