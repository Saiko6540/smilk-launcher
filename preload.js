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
  getGithubCatalog: () => ipcRenderer.invoke('get-github-catalog'),
  openWebsite: () => ipcRenderer.send('open-website'),
  openDiscord: () => ipcRenderer.send('open-discord'),
  openConsoleWindow: () => ipcRenderer.send('open-console-window'),
  openInstancesDir: () => ipcRenderer.send('open-instances-dir'),
  openInstanceDir: (instanceId) => ipcRenderer.send('open-instance-dir', instanceId),
  deleteInstance: (instanceId) => ipcRenderer.invoke('delete-instance', instanceId),
  resetPackSettings: (packKey) => ipcRenderer.invoke('reset-pack-settings', packKey),
  deletePack: (packKey) => ipcRenderer.invoke('delete-pack', packKey),
  getMcLogs: (packKey) => ipcRenderer.invoke('get-mc-logs', packKey),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore'),
  launcherHide: () => ipcRenderer.send('launcher-hide'),
  launcherShow: () => ipcRenderer.send('launcher-show'),
  
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
  },
  onSettingsUpdate: (callback) => {
    const listener = (event, settings) => callback(settings);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  }
});
