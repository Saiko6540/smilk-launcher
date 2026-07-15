const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { checkAndInstallUpdate } = require('./updater');
const { launchMinecraft } = require('./launcher');
const { autoUpdater } = require('electron-updater');
const DiscordRPC = require('discord-rpc');

// --- Discord RPC Setup ---
const clientId = '1525456449440845904'; // User provided Client ID
let rpc;
const startTimestamp = new Date();

function initDiscordRPC() {
  if (!clientId || clientId === '') return;

  DiscordRPC.register(clientId);
  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    setDiscordActivity({ details: 'In Menu', state: 'Choosing modpack' });
    console.log('Discord RPC started');
  });

  rpc.login({ clientId }).catch(e => console.error('Discord RPC failed:', e.message));
}

function setDiscordActivity(data) {
  if (!rpc) return;
  try {
    rpc.setActivity({
      details: data.details,
      state: data.state,
      startTimestamp,
      largeImageKey: 'icon',
      largeImageText: 'smilk launcher',
      instance: false,
    }).catch(e => console.error('SetActivity Error:', e));
  } catch (e) {
    console.error('setDiscordActivity try/catch Error:', e);
  }
}
// -------------------------

let mainWindow;
let consoleWindow;
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
const logFilePath = path.join(userDataPath, 'launcher.log');
const defaultSettings = {
  nickname: 'Player',
  ramGb: 12,
  javaPath: '',
  jvmArgs: '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:MaxGCPauseMillis=100 -XX:+DisableExplicitGC',
  selectedPack: 'stranded_at_sea',
  mockMode: false // Disabled by default for normal production play
};

// Default modpacks configuration
const modpacks = {
  stranded_at_sea: {
    name: 'Create: Stranded at sea',
    mcVersion: '1.20.1',
    loader: 'fabric-0.15.11',
    configUrl: 'https://github.com/ddidif/submarinemilkkk/raw/sea/modpack_test_1.0.0.mrpack',
    mockConfig: {
      version: '1.2.0',
      minecraft: '1.20.1',
      loader: 'fabric-0.15.11',
      mrpack_url: 'mock://stranded_at_sea/pack.mrpack'
    }
  },
  democky_edition: {
    name: 'Create +',
    mcVersion: '1.20.1',
    loader: 'forge-47.2.0',
    configUrl: 'https://github.com/ddidif/submarinemilkkk/raw/createplus/modpack_test_1.0.0.mrpack',
    mockConfig: {
      version: '1.0.5',
      minecraft: '1.20.1',
      loader: 'forge-47.2.0',
      mrpack_url: 'mock://democky_edition/pack.mrpack'
    }
  },
  cobblemon: {
    name: 'Cobblemon',
    mcVersion: '1.20.1',
    loader: 'fabric-0.15.11',
    configUrl: 'https://github.com/ddidif/submarinemilkkk/raw/cobblemon/modpack_test_1.0.0.mrpack',
    mockConfig: {
      version: '2.1.0',
      minecraft: '1.20.1',
      loader: 'fabric-0.15.11',
      mrpack_url: 'mock://cobblemon/pack.mrpack'
    }
  },
  vanilla_plus: {
    name: 'Vanilla+',
    mcVersion: '1.21.1',
    loader: 'fabric-0.16.5',
    configUrl: 'https://github.com/ddidif/submarinemilkkk/raw/vanilla+/Super%20vanilla.mrpack',
    mockConfig: {
      version: '1.0.0',
      minecraft: '1.21.1',
      loader: 'fabric-0.16.5',
      mrpack_url: 'mock://vanilla_plus/pack.mrpack'
    }
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Turn off default OS frame
    title: 'smilk',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });


  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close console window when main window closes
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.close();
    }
  });

  log('info', 'Launcher started successfully');
  log('info', `Version: 1.0.0 | Platform: ${process.platform}`);
  log('info', `Electron: ${process.versions.electron} | Node: ${process.versions.node}`);
}

function createConsoleWindow() {
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.focus();
    return;
  }

  consoleWindow = new BrowserWindow({
    width: 700,
    height: 500,
    minWidth: 500,
    minHeight: 300,
    frame: false,
    title: 'Launcher Debug Console',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0c0c10',
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload-console.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  consoleWindow.loadFile(path.join(__dirname, 'console.html'));

  consoleWindow.on('closed', () => {
    consoleWindow = null;
  });

  // Send buffered logs
  consoleWindow.webContents.on('did-finish-load', () => {
    logBuffer.forEach(entry => {
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        consoleWindow.webContents.send('console-log', entry);
      }
    });
  });
}

// === LOGGING SYSTEM ===
const logBuffer = [];
const MAX_LOG_BUFFER = 500;

// Initialize log file (clear old logs)
try {
  fs.writeFileSync(logFilePath, `=== LAUNCHER STARTED AT ${new Date().toISOString()} ===\n`, 'utf8');
} catch (e) { /* ignore */ }

function log(level, message) {
  const timestamp = new Date().toISOString();
  const entry = { level, message, timestamp };

  // Buffer for console window
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();

  // Write to file
  try {
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(logFilePath, logLine, 'utf8');
  } catch (e) { /* ignore file errors */ }

  // Send to console window if open
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.webContents.send('console-log', entry);
  }

  // Also stdout
  console.log(`[${level.toUpperCase()}] ${message}`);
}

app.whenReady().then(() => {
  // Clear HTTP/Image cache to prevent memory leaks over time
  const { session } = require('electron');
  session.defaultSession.clearCache().then(() => {
    console.log('Session cache cleared successfully to free memory');
  });

  createWindow();
  initDiscordRPC();

  // Check for auto-updates explicitly
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('app-update-state', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log('info', 'App update available.');
    if (mainWindow) mainWindow.webContents.send('app-update-state', { status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    log('info', 'App update not available.');
    if (mainWindow) mainWindow.webContents.send('app-update-state', { status: 'not-available' });
  });

  autoUpdater.on('error', (err) => {
    log('error', 'Error in auto-updater: ' + err.message);
    if (mainWindow) mainWindow.webContents.send('app-update-state', { status: 'error', message: err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('app-update-state', {
      status: 'progress',
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log('info', 'App update downloaded. Ready to install.');
    if (mainWindow) mainWindow.webContents.send('app-update-state', { status: 'downloaded' });
  });

  // Start the check
  autoUpdater.checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('install-app-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Load Settings IPC
ipcMain.handle('load-settings', () => {
  const os = require('os');
  const totalMemGb = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
  let loadedSettings = { ...defaultSettings };

  if (fs.existsSync(settingsPath)) {
    try {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const loaded = JSON.parse(data);
      // Merge with defaults to ensure all keys exist
      loadedSettings = { ...defaultSettings, ...loaded };
    } catch (e) {
      console.error('Error loading settings, returning defaults:', e);
    }
  }

  return { settings: loadedSettings, systemMemoryGb: totalMemGb };
});

// Save Settings IPC
ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    console.error('Error saving settings:', e);
    return { success: false, error: e.message };
  }
});

// Reset Settings IPC
ipcMain.handle('reset-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
    const os = require('os');
    const totalMemGb = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
    return { success: true, settings: defaultSettings, systemMemoryGb: totalMemGb };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Clear Instances IPC
ipcMain.handle('clear-instances', () => {
  try {
    const instancesDir = path.join(userDataPath, 'game_data', 'instances');
    if (fs.existsSync(instancesDir)) {
      fs.rmSync(instancesDir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Select Java path via file dialog
ipcMain.handle('select-java-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Java Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Java Executable', extensions: ['exe', 'bin', '*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-shaderpack-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Shaderpack (.zip)',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Shaderpack Archive', extensions: ['zip'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('import-shaderpack', async (event, packKey, filePaths) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
    const shaderpacksDir = path.join(instanceDir, 'shaderpacks');
    
    if (!fs.existsSync(shaderpacksDir)) {
      fs.mkdirSync(shaderpacksDir, { recursive: true });
    }
    
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const imported = [];
    
    for (const fp of paths) {
      const filename = path.basename(fp);
      const destPath = path.join(shaderpacksDir, filename);
      fs.copyFileSync(fp, destPath);
      imported.push(filename);
    }
    
    return { success: true, imported };
  } catch (err) {
    console.error('Failed to import shaderpacks:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-installed-shaders', async (event, packKey) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
    const shaderpacksDir = path.join(instanceDir, 'shaderpacks');
    if (!fs.existsSync(shaderpacksDir)) {
      return [];
    }
    const files = fs.readdirSync(shaderpacksDir);
    const shaderpacks = [];
    for (const file of files) {
      const fullPath = path.join(shaderpacksDir, file);
      if (file.endsWith('.zip') || fs.statSync(fullPath).isDirectory()) {
        shaderpacks.push(file);
      }
    }
    return shaderpacks;
  } catch (err) {
    console.error('Failed to get installed shaders:', err);
    return [];
  }
});

ipcMain.handle('delete-shaderpack', async (event, packKey, filename) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
    const filePath = path.join(instanceDir, 'shaderpacks', filename);
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`Deleted shaderpack ${filename}`);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    console.error('Failed to delete shaderpack:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-game-options', async (event, packKey) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
    const configPath = path.join(instanceDir, 'local_version.json');
    if (!fs.existsSync(configPath)) {
      return { success: false, error: 'Modpack not installed' };
    }
    const optionsPath = path.join(instanceDir, 'options.txt');
    const resourcepacksDir = path.join(instanceDir, 'resourcepacks');

    const availableResourcePacks = [];
    if (fs.existsSync(resourcepacksDir)) {
      const files = fs.readdirSync(resourcepacksDir);
      for (const file of files) {
        const fullPath = path.join(resourcepacksDir, file);
        if (file.endsWith('.zip') || fs.statSync(fullPath).isDirectory()) {
          availableResourcePacks.push(file);
        }
      }
    }

    const options = {
      renderDistance: 12,
      enableVsync: true,
      fov: 0.0,
      mouseSensitivity: 0.5,
      guiScale: 0,
      maxFps: 260,
      soundCategory_master: 1.0,
      soundCategory_music: 1.0,
      fullscreen: false,
      resourcePacks: []
    };

    if (fs.existsSync(optionsPath)) {
      const content = fs.readFileSync(optionsPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const part = line.trim();
        if (!part || part.startsWith('#')) continue;
        const index = part.indexOf(':');
        if (index === -1) continue;
        
        const key = part.substring(0, index).trim();
        const val = part.substring(index + 1).trim();

        if (key === 'renderDistance') {
          options.renderDistance = parseInt(val, 10) || 12;
        } else if (key === 'enableVsync') {
          options.enableVsync = val === 'true';
        } else if (key === 'fov') {
          options.fov = parseFloat(val) || 0.0;
        } else if (key === 'mouseSensitivity') {
          options.mouseSensitivity = parseFloat(val) || 0.5;
        } else if (key === 'guiScale') {
          options.guiScale = parseInt(val, 10) || 0;
        } else if (key === 'maxFps') {
          options.maxFps = parseInt(val, 10) || 260;
        } else if (key === 'soundCategory_master') {
          options.soundCategory_master = parseFloat(val) || 1.0;
        } else if (key === 'soundCategory_music') {
          options.soundCategory_music = parseFloat(val) || 1.0;
        } else if (key === 'fullscreen') {
          options.fullscreen = val === 'true';
        } else if (key === 'resourcePacks') {
          try {
            options.resourcePacks = JSON.parse(val);
          } catch (e) {}
        }
      }
    }

    return { success: true, options, availableResourcePacks };
  } catch (err) {
    console.error('Failed to read game options:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-game-options', async (event, packKey, optionsObj) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
    const optionsPath = path.join(instanceDir, 'options.txt');

    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    let optionsMap = new Map();
    if (fs.existsSync(optionsPath)) {
      const content = fs.readFileSync(optionsPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const part = line.trim();
        if (!part) continue;
        const index = part.indexOf(':');
        if (index === -1) {
          optionsMap.set(part, null);
          continue;
        }
        const key = part.substring(0, index).trim();
        const val = part.substring(index + 1).trim();
        optionsMap.set(key, val);
      }
    }

    if (optionsObj.renderDistance !== undefined) {
      optionsMap.set('renderDistance', String(optionsObj.renderDistance));
    }
    if (optionsObj.enableVsync !== undefined) {
      optionsMap.set('enableVsync', String(optionsObj.enableVsync));
    }
    if (optionsObj.fov !== undefined) {
      optionsMap.set('fov', String(optionsObj.fov));
    }
    if (optionsObj.mouseSensitivity !== undefined) {
      optionsMap.set('mouseSensitivity', String(optionsObj.mouseSensitivity));
    }
    if (optionsObj.guiScale !== undefined) {
      optionsMap.set('guiScale', String(optionsObj.guiScale));
    }
    if (optionsObj.maxFps !== undefined) {
      optionsMap.set('maxFps', String(optionsObj.maxFps));
    }
    if (optionsObj.soundCategory_master !== undefined) {
      optionsMap.set('soundCategory_master', String(optionsObj.soundCategory_master));
    }
    if (optionsObj.soundCategory_music !== undefined) {
      optionsMap.set('soundCategory_music', String(optionsObj.soundCategory_music));
    }
    if (optionsObj.fullscreen !== undefined) {
      optionsMap.set('fullscreen', String(optionsObj.fullscreen));
    }
    if (optionsObj.resourcePacks !== undefined) {
      optionsMap.set('resourcePacks', JSON.stringify(optionsObj.resourcePacks));
    }

    let newContent = '';
    for (const [key, val] of optionsMap.entries()) {
      if (val === null) {
        newContent += key + '\n';
      } else {
        newContent += `${key}:${val}\n`;
      }
    }

    fs.writeFileSync(optionsPath, newContent, 'utf8');
    console.log(`Saved options.txt successfully for ${packKey}`);
    return { success: true };
  } catch (err) {
    console.error('Failed to save game options:', err);
    return { success: false, error: err.message };
  }
});

// Open website externally
ipcMain.on('open-website', () => {
  shell.openExternal('https://submarinemilk.com');
});

// Open game directory externally
ipcMain.on('open-instances-dir', () => {
  const instancesDir = path.join(userDataPath, 'game_data', 'instances');
  if (!fs.existsSync(instancesDir)) {
    fs.mkdirSync(instancesDir, { recursive: true });
  }
  shell.openPath(instancesDir);
});

// Open shaders directory externally
ipcMain.on('open-shaders-dir', (event, packKey) => {
  const shadersDir = path.join(userDataPath, 'game_data', 'instances', packKey, 'shaderpacks');
  if (!fs.existsSync(shadersDir)) {
    fs.mkdirSync(shadersDir, { recursive: true });
  }
  shell.openPath(shadersDir);
});

// Open external link
ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Console window controls
ipcMain.on('open-console-window', () => {
  createConsoleWindow();
});

ipcMain.on('console-window-minimize', () => {
  if (consoleWindow && !consoleWindow.isDestroyed()) consoleWindow.minimize();
});

ipcMain.on('console-window-close', () => {
  if (consoleWindow && !consoleWindow.isDestroyed()) consoleWindow.close();
});

ipcMain.handle('get-app-version', () => app.getVersion());


// Check Updates IPC
ipcMain.handle('check-updates', async (event, packKey) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
  const localVersionFile = path.join(instanceDir, 'local_version.json');

  const pack = modpacks[packKey];
  if (!pack) throw new Error('Unknown modpack');

  let localVersion = 'none';
  let packVersion = null;
  let commitMessage = null;
  let mcVersion = null;
  let localConfig = null;

  if (fs.existsSync(localVersionFile)) {
    try {
      localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
      localVersion = localConfig.version;
      packVersion = localConfig.packVersion;
      commitMessage = localConfig.commitMessage;
      mcVersion = localConfig.minecraft;
    } catch (e) { }
  }

  // Retroactive metadata fetch if version is present but user-facing version info is missing
  if (localConfig && !packVersion && !commitMessage) {
    const configUrl = pack.configUrl;
    if (configUrl && (configUrl.includes('github.com') || configUrl.includes('githubusercontent.com'))) {
      try {
        const repoMatch = configUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/raw\/([^\/]+)\/(.+)/);
        if (repoMatch) {
          const [_, owner, repo, branch, filepath] = repoMatch;
          const safeBranch = encodeURIComponent(decodeURIComponent(branch));
          const safePath = encodeURIComponent(decodeURIComponent(filepath));
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${safePath}&sha=${safeBranch}&page=1&per_page=1`;
          
          const https = require('https');
          const apiText = await new Promise((resolve, reject) => {
            const req = https.get(apiUrl, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.setTimeout(3000, () => {
              req.destroy();
              reject(new Error('Timeout'));
            });
          });
          const json = JSON.parse(apiText);
          if (json && json.length > 0 && json[0].commit) {
            const remoteCommitMsg = json[0].commit.message;
            if (remoteCommitMsg) {
              commitMessage = remoteCommitMsg;
              localConfig.commitMessage = remoteCommitMsg;
              
              const cleanVerMatch = remoteCommitMsg.trim().match(/^v?(\d+\.\d+(?:\.\d+)?)$/i);
              if (cleanVerMatch) {
                packVersion = cleanVerMatch[1];
                localConfig.packVersion = cleanVerMatch[1];
              }
              
              fs.writeFileSync(localVersionFile, JSON.stringify(localConfig, null, 2), 'utf8');
              console.log(`Resolved missing commitMessage/packVersion retroactively for ${packKey} via API: ${remoteCommitMsg}`);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed background metadata resolution for ${packKey}:`, err.message);
      }
    }
  }

  return {
    localVersion,
    packVersion,
    commitMessage,
    mcVersion,
    remoteVersion: 'Checking...', // Will check via start-update
    mockMode: settings.mockMode
  };
});

// Start Update IPC
ipcMain.handle('start-update', async (event, packKey) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
  const pack = modpacks[packKey];

  if (!pack) throw new Error('Unknown modpack');

  const sendProgress = (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', data);
    }
  };

  // Run real update
  try {
    await checkAndInstallUpdate(packKey, pack.configUrl, instanceDir, sendProgress, settings);
    return { success: true };
  } catch (err) {
    sendProgress({ status: 'error', message: err.message });
    return { success: false, error: err.message };
  }
});

// Start Launch IPC
ipcMain.handle('start-launch', async (event, packKey) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
  const pack = modpacks[packKey];

  if (!pack) throw new Error('Unknown modpack');

  const sendProgress = (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('launch-status', data);
    }

    // Discord RPC Update
    if (data.status === 'game_started') {
      setDiscordActivity({
        details: `Playing: ${pack.name}`,
        state: `Nickname: ${settings.nickname}`
      });
    } else if (data.status === 'game_exited' || data.status === 'game_crashed' || data.status === 'error') {
      setDiscordActivity({
        details: 'In Menu',
        state: 'Choosing modpack'
      });
    }

    if (consoleWindow && !consoleWindow.isDestroyed()) {
      if (data.status === 'game_running' || data.status === 'error') {
        let level = 'info';
        if (data.status === 'error') {
          level = 'error';
        } else if (typeof data.message === 'string') {
          const lower = data.message.toLowerCase();
          if (lower.includes('/error]') || lower.includes(' exception') || lower.includes('error:')) {
            level = 'error';
          } else if (lower.includes('/warn]') || lower.includes(' warning:')) {
            level = 'warn';
          }
        }

        consoleWindow.webContents.send('console-log', {
          message: data.message,
          level: level
        });
      }
    }
  };

  // Run real launch
  try {
    const localVersionFile = path.join(instanceDir, 'local_version.json');
    if (!fs.existsSync(localVersionFile)) {
      throw new Error('Modpack must be installed before launching.');
    }
    const localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));

    await launchMinecraft(
      instanceDir,
      settings.nickname,
      settings.ramGb,
      settings.javaPath,
      settings.jvmArgs,
      localConfig.minecraft,
      localConfig.loader,
      sendProgress
    );
    return { success: true };
  } catch (err) {
    if (err.javaError) {
      sendProgress({ status: 'java-error', requiredVersion: err.requiredVersion, message: err.message });
      return { success: false, javaError: true, requiredVersion: err.requiredVersion, error: err.message };
    }
    sendProgress({ status: 'error', message: err.message });
    return { success: false, error: err.message };
  }
});

// Install Java IPC
ipcMain.handle('install-java', async (event, requiredVersion) => {
  const AdmZip = require('adm-zip');
  const https = require('https');

  const javaDir = path.join(userDataPath, 'game_data', 'java', `jre_${requiredVersion}`);
  if (fs.existsSync(javaDir)) {
    fs.rmSync(javaDir, { recursive: true, force: true });
  }
  fs.mkdirSync(javaDir, { recursive: true });

  const zipPath = path.join(javaDir, `jre_${requiredVersion}.zip`);
  const apiUrl = `https://api.adoptium.net/v3/binary/latest/${requiredVersion}/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk`;

  // Download ZIP with redirect support
  function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        } else if (res.statusCode === 200) {
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', reject);
        } else {
          reject(new Error(`Failed to download: Status Code ${res.statusCode}`));
        }
      }).on('error', reject);
    });
  }

  await downloadFile(apiUrl, zipPath);

  // Extract ZIP
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(javaDir, true);
  fs.unlinkSync(zipPath); // Delete zip

  // Find javaw.exe
  let newJavaPath = null;
  function findJavaw(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findJavaw(fullPath);
        if (found) return found;
      } else if (f.toLowerCase() === 'javaw.exe') {
        return fullPath;
      }
    }
    return null;
  }
  newJavaPath = findJavaw(javaDir);

  if (!newJavaPath) {
    throw new Error("Downloaded Java but couldn't find javaw.exe inside!");
  }

  // Update Settings
  const currentSettings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  currentSettings.javaPath = newJavaPath;
  fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2), 'utf8');

  return { success: true, javaPath: newJavaPath };
});

// Open Console Window IPC
ipcMain.on('open-console-window', () => {
  if (consoleWindow) {
    consoleWindow.focus();
    return;
  }

  consoleWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload-console.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  consoleWindow.loadFile('console.html');

  consoleWindow.on('closed', () => {
    consoleWindow = null;
  });
});

// Window Control IPCs

ipcMain.on('window-restore', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.on('launcher-hide', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('launcher-show', () => {
  if (mainWindow) mainWindow.show();
});

// Upload Log IPC
ipcMain.handle('upload-log', async (event, instanceDir) => {
  const logFile = path.join(instanceDir, 'logs', 'latest.log');
  if (!fs.existsSync(logFile)) {
    throw new Error('Log file not found');
  }

  const logContent = fs.readFileSync(logFile, 'utf8');
  const postData = new URLSearchParams({
    'content': logContent
  }).toString();

  const options = {
    hostname: 'api.mclo.gs',
    port: 443,
    path: '/1/log',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = require('https').request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.success) {
            resolve({ success: true, url: json.url });
          } else {
            reject(new Error('Failed to upload log: ' + (json.error || 'Unknown error')));
          }
        } catch (e) {
          reject(new Error('Invalid response from mclo.gs'));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
});
