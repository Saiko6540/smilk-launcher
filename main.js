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
  instances: [], // Array of installed instances objects: { id, name, mcVersion, loader, branch, versionType }
  mockMode: false // Disabled by default for normal production play
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
  createWindow();
  initDiscordRPC();

  // Check for auto-updates (silently in background)
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', () => {
    log('info', 'App update downloaded. It will be installed on quit.');
    // Optionally: autoUpdater.quitAndInstall(); here if you want immediate restart
  });

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
ipcMain.handle('delete-instance', async (event, instanceId) => {
  try {
    const instanceDir = path.join(userDataPath, 'game_data', 'instances', instanceId);
    if (fs.existsSync(instanceDir)) {
      fs.rmSync(instanceDir, { recursive: true, force: true });
    }
    const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
    if (settings.instances) {
      settings.instances = settings.instances.filter(i => i.id !== instanceId);
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      if (mainWindow) mainWindow.webContents.send('settings-updated', settings);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('clear-instances', () => {
  try {
    const instancesDir = path.join(userDataPath, 'game_data', 'instances');
    if (fs.existsSync(instancesDir)) {
      fs.rmSync(instancesDir, { recursive: true, force: true });
    }
    const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
    settings.instances = [];
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    if (mainWindow) mainWindow.webContents.send('settings-updated', settings);
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

// Open discord externally
ipcMain.on('open-discord', () => {
  shell.openExternal('https://discord.gg/f6SVFATANW');
});

// Open game directory externally
ipcMain.on('open-instances-dir', () => {
  const instancesDir = path.join(userDataPath, 'game_data', 'instances');
  if (!fs.existsSync(instancesDir)) {
    fs.mkdirSync(instancesDir, { recursive: true });
  }
  shell.openPath(instancesDir);
});

// Open specific instance directory
ipcMain.on('open-instance-dir', (event, instanceId) => {
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', instanceId);
  if (fs.existsSync(instanceDir)) {
    shell.openPath(instanceDir);
  } else {
    // If it doesn't exist, open the parent instances directory
    const instancesDir = path.join(userDataPath, 'game_data', 'instances');
    shell.openPath(instancesDir);
  }
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
ipcMain.handle('check-updates', async (event, instanceId) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', instanceId);
  const localVersionFile = path.join(instanceDir, 'local_version.json');

  const instance = settings.instances ? settings.instances.find(i => i.id === instanceId) : null;
  if (!instance) {
    return { localVersion: 'none', error: 'Unknown instance' };
  }

  let localVersion = 'none';
  let commitMessage = null;
  let mcVersion = null;
  if (fs.existsSync(localVersionFile)) {
    try {
      const localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
      localVersion = localConfig.version;
      commitMessage = localConfig.commitMessage;
      mcVersion = localConfig.minecraft;
    } catch (e) { }
  }

  return {
    localVersion,
    commitMessage,
    mcVersion,
    remoteVersion: 'Checking...',
    mockMode: settings.mockMode
  };
});

// Start Update IPC
ipcMain.handle('start-update', async (event, instanceId) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', instanceId);
  const instance = settings.instances ? settings.instances.find(i => i.id === instanceId) : null;

  if (!instance) throw new Error('Unknown instance');

  const sendProgress = (data) => {
    if (mainWindow) mainWindow.webContents.send('update-status', data);
  };

  try {
    // Generate configUrl pointing to the selected mrpack on the branch
    const repoOwner = 'ddidif';
    const repoName = 'submarinemilkkk';
    const configUrl = `https://github.com/${repoOwner}/${repoName}/raw/${instance.branch}/${encodeURIComponent(instance.mrpackPath)}`;
    
    await checkAndInstallUpdate(instanceId, configUrl, instanceDir, sendProgress);
    
    // After install, update the local settings with exact MC version / loader from local_version.json
    const localVersionFile = path.join(instanceDir, 'local_version.json');
    if (fs.existsSync(localVersionFile)) {
      const localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
      instance.mcVersion = localConfig.minecraft;
      instance.loader = localConfig.loader;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      
      // Notify renderer that settings updated
      if (mainWindow) mainWindow.webContents.send('settings-updated', settings);
    }
    
    return { success: true };
  } catch (err) {
    sendProgress({ status: 'error', message: err.message });
    return { success: false, error: err.message };
  }
});

// Start Launch IPC
ipcMain.handle('start-launch', async (event, instanceId) => {
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : defaultSettings;
  const instanceDir = path.join(userDataPath, 'game_data', 'instances', instanceId);
  const instance = settings.instances ? settings.instances.find(i => i.id === instanceId) : null;

  if (!instance) throw new Error('Unknown instance');

  const sendProgress = (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('launch-status', data);
    }

    if (data.status === 'game_started') {
      setDiscordActivity({
        details: `Playing: ${instance.name}`,
        state: `Nickname: ${settings.nickname}`
      });
    } else if (data.status === 'game_exited' || data.status === 'game_crashed' || data.status === 'error') {
      setDiscordActivity({
        details: 'In Menu',
        state: 'Choosing instance'
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

  try {
    const localVersionFile = path.join(instanceDir, 'local_version.json');
    if (!fs.existsSync(localVersionFile)) {
      throw new Error('Instance must be installed before launching.');
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
ipcMain.handle('get-github-catalog', async () => {
  const repoOwner = 'ddidif';
  const repoName = 'submarinemilkkk';
  const cachePath = path.join(userDataPath, 'catalog_cache.json');

  try {
    const fetch = require('node-fetch'); // Electron has fetch natively or we can use https, but Node 20+ has fetch built-in
  } catch (e) {}

  let catalog = [];
  try {
    const fetchHeaders = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    // Fetch catalog.json directly from raw.githubusercontent.com (No Rate Limits!)
    const catalogUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/catalog.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(catalogUrl + `?timestamp=${Date.now()}`, { headers: fetchHeaders, signal: controller.signal });
    if (!res.ok) {
      // Try master branch as fallback
      const fallbackUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/master/catalog.json`;
      const fallbackRes = await fetch(fallbackUrl + `?timestamp=${Date.now()}`, { headers: fetchHeaders, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!fallbackRes.ok) throw new Error('Failed to fetch catalog.json from main or master branch');

      catalog = await fallbackRes.json();
    } else {
      clearTimeout(timeoutId);
      catalog = await res.json();
    }

    // Write to cache
    fs.writeFileSync(cachePath, JSON.stringify(catalog, null, 2), 'utf8');
  } catch (err) {
    console.error('GitHub Catalog Fetch failed, checking cache:', err);
    if (fs.existsSync(cachePath)) {
      try {
        catalog = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      } catch (cacheErr) {
        console.error('Failed to read catalog cache:', cacheErr);
        throw err;
      }
    } else {
      throw err;
    }
  }

  try {
    const debugPath = path.join(userDataPath, 'catalog_debug.log');
    fs.writeFileSync(debugPath, JSON.stringify(catalog, null, 2), 'utf8');
  } catch (e) {
    console.error('Debug log write failed:', e);
  }
  return catalog;
});
