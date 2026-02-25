const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    sendUpdateResponse: (accept, autoUpdate) => ipcRenderer.send('update-response', { accept, autoUpdate })
});
