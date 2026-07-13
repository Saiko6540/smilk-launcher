const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  clearInstances: () => ipcRenderer.invoke('clear-instances'),
  selectJavaPath: () => ipcRenderer.invoke('select-java-path'),
  checkUpdates: (packKey) => ipcRenderer.invoke('check-updates', packKey),
  startUpdate: (packKey) => ipcRenderer.invoke('start-update', packKey),
  startLaunch: (packKey) => ipcRenderer.invoke('start-launch', packKey),
  installJava: (version) => ipcRenderer.invoke('install-java', version),
  uploadLog: (instanceDir) => ipcRenderer.invoke('upload-log', instanceDir),
  openWebsite: () => ipcRenderer.send('open-website'),
  openConsoleWindow: () => ipcRenderer.send('open-console-window'),
  openInstancesDir: () => ipcRenderer.send('open-instances-dir'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore'),
  launcherHide: () => ipcRenderer.send('launcher-hide'),
  launcherShow: () => ipcRenderer.send('launcher-show'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  
  // Event listeners
  onUpdateStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  onLaunchStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('launch-status', listener);
    return () => ipcRenderer.removeListener('launch-status', listener);
  }
});
