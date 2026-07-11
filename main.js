const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { checkAndInstallUpdate } = require('./updater');
const { launchMinecraft } = require('./launcher');

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
    configUrl: 'https://raw.githubusercontent.com/Saiko/stranded-at-sea/main/version.json',
    mockConfig: {
      version: '1.2.0',
      minecraft: '1.20.1',
      loader: 'fabric-0.15.11',
      mrpack_url: 'mock://stranded_at_sea/pack.mrpack'
    }
  },
  democky_edition: {
    name: 'Create: Democky edition',
    mcVersion: '1.20.1',
    loader: 'forge-47.2.0',
    configUrl: 'https://raw.githubusercontent.com/Saiko/democky-edition/main/version.json',
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
    configUrl: 'https://github.com/ddidif/submarinemilkkk/raw/main/modpack_test_1.0.0.mrpack',
    mockConfig: {
      version: '2.1.0',
      minecraft: '1.20.1',
      loader: 'fabric-0.15.11',
      mrpack_url: 'mock://cobblemon/pack.mrpack'
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
    title: 'Submarine Milk Launcher',
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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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
    const instancesDir = path.join(__dirname, 'game_data', 'instances');
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

// Open website externally
ipcMain.on('open-website', () => {
  shell.openExternal('https://submarinemilk.com');
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


// Check Updates IPC
ipcMain.handle('check-updates', async (event, packKey) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', packKey);
  const localVersionFile = path.join(instanceDir, 'local_version.json');
  
  const pack = modpacks[packKey];
  if (!pack) throw new Error('Unknown modpack');

  let localVersion = 'none';
  let commitMessage = null;
  let mcVersion = null;
  if (fs.existsSync(localVersionFile)) {
    try {
      const localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
      localVersion = localConfig.version;
      commitMessage = localConfig.commitMessage;
      mcVersion = localConfig.minecraft;
    } catch (e) {}
  }

  return {
    localVersion,
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
    await checkAndInstallUpdate(packKey, pack.configUrl, instanceDir, sendProgress);
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
    sendProgress({ status: 'error', message: err.message });
    return { success: false, error: err.message };
  }
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
