const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('consoleApi', {
  onLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('console-log', listener);
    return () => ipcRenderer.removeListener('console-log', listener);
  },
  minimizeWindow: () => ipcRenderer.send('console-window-minimize'),
  closeWindow: () => ipcRenderer.send('console-window-close')
});
