import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f7f8ff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(ROOT, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // Auto-update runs only in production (packed) builds with a GitHub release configured.
  // Wire it in once GitHub Releases are live: import electron-updater and call checkForUpdatesAndNotify().
  if (app.isPackaged) {
    import('electron-updater').then(({ default: pkg }) => {
      pkg.autoUpdater.checkForUpdatesAndNotify();
    }).catch(() => {});
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('navigate', (_e, page) => {
  const file = page === 'admin' ? 'admin.html' : 'index.html';
  win.loadFile(path.join(ROOT, file));
});

ipcMain.on('open-external', (_e, url) => shell.openExternal(url));
