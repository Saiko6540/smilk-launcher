const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  clearInstances: () => ipcRenderer.invoke('clear-instances'),
  resetPackSettings: (packKey) => ipcRenderer.invoke('reset-pack-settings', packKey),
  deletePack: (packKey) => ipcRenderer.invoke('delete-pack', packKey),
  selectJavaPath: () => ipcRenderer.invoke('select-java-path'),
  checkUpdates: (packKey) => ipcRenderer.invoke('check-updates', packKey),
  startUpdate: (packKey) => ipcRenderer.invoke('start-update', packKey),
  startLaunch: (packKey, nickname) => ipcRenderer.invoke('start-launch', packKey, nickname),
  installJava: (version) => ipcRenderer.invoke('install-java', version),
  uploadLog: (instanceDir) => ipcRenderer.invoke('upload-log', instanceDir),
  openWebsite: () => ipcRenderer.send('open-website'),
  openConsoleWindow: () => ipcRenderer.send('open-console-window'),
  openInstancesDir: () => ipcRenderer.send('open-instances-dir'),
  openShadersDir: (packKey) => ipcRenderer.send('open-shaders-dir', packKey),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore'),
  launcherHide: () => ipcRenderer.send('launcher-hide'),
  launcherShow: () => ipcRenderer.send('launcher-show'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  importShaderpack: (packKey, filePath) => ipcRenderer.invoke('import-shaderpack', packKey, filePath),
  selectShaderpackFile: () => ipcRenderer.invoke('select-shaderpack-file'),
  getInstalledShaders: (packKey) => ipcRenderer.invoke('get-installed-shaders', packKey),
  deleteShaderpack: (packKey, filename) => ipcRenderer.invoke('delete-shaderpack', packKey, filename),
  readGameOptions: (packKey) => ipcRenderer.invoke('read-game-options', packKey),
  saveGameOptions: (packKey, options) => ipcRenderer.invoke('save-game-options', packKey, options),

  
  // Event listeners
  onAppUpdateState: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('app-update-state', listener);
    return () => ipcRenderer.removeListener('app-update-state', listener);
  },
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
