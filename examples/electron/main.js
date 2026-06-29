const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 7331;
const ROOT = __dirname;
const INBOX = path.join(ROOT, '.vibepin', 'inbox.jsonl');
const DAEMON = path.join(ROOT, '..', '..', 'daemon', 'daemon.js');
const isDev = !app.isPackaged;

let daemonProc = null;

function startDaemon() {
  // Run the daemon as plain Node using Electron's own binary (no system node needed).
  daemonProc = spawn(process.execPath, [DAEMON, '--inbox', INBOX], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ANNOTATE_PORT: String(PORT) },
    stdio: 'inherit',
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    backgroundColor: '#0f1012',
    webPreferences: { preload: path.join(ROOT, 'preload.js') },
  });

  win.loadFile('index.html');

  if (isDev) {
    // Inject the overlay only in dev. The renderer HTML stays clean.
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(`
        (function () {
          var s = document.createElement('script');
          s.src = 'http://127.0.0.1:${PORT}/annotate.js';
          document.body.appendChild(s);
        })();
      `);
    });

    // Pixel-perfect element screenshots — the Electron-only bonus.
    ipcMain.handle('annotate:capture', async (_e, rect) => {
      const img = await win.webContents.capturePage({
        x: Math.max(0, Math.round(rect.x)),
        y: Math.max(0, Math.round(rect.y)),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
      return img.toDataURL();
    });

    // Dev live-reload: reload the window when index.html changes, so the agent's
    // edits show up without a manual ⌘R (no HMR for a static loadFile otherwise).
    let reloadTimer = null;
    require('node:fs').watch(ROOT, (_evt, file) => {
      if (file === 'index.html') {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => { if (!win.isDestroyed()) win.webContents.reload(); }, 150);
      }
    });
  }
}

app.whenReady().then(() => {
  if (isDev) startDaemon();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (daemonProc) daemonProc.kill();
  if (process.platform !== 'darwin') app.quit();
});
app.on('quit', () => { if (daemonProc) daemonProc.kill(); });
