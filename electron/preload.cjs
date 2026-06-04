const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  navigate: (page) => ipcRenderer.send('navigate', page),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  isElectron: true,
});
