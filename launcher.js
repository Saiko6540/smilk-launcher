const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { getFileSha1 } = require('./mod-helper');

/**
 * Helper to download a file with redirect support
 */
function downloadFile(url, destPath, options = {}) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    let file = null;
    let isFinished = false;

    const doReq = (curUrl, redirectCount = 0) => {
      if (redirectCount > 15) {
        if (file) file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Too many redirects downloading ${url}`));
      }

      let parsed;
      try {
        parsed = new URL(curUrl);
      } catch (err) {
        if (file) file.close();
        fs.unlink(destPath, () => {});
        return reject(err);
      }

      const client = parsed.protocol === 'http:' ? http : https;
      const requestOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 smilk-launcher',
          'Accept': '*/*'
        },
        ...options
      };

      const request = client.request(requestOptions, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          let loc = response.headers.location;
          if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
            loc = new URL(loc, curUrl).href;
          }
          response.resume();
          return doReq(loc, redirectCount + 1);
        }

        if (response.statusCode !== 200) {
          response.resume();
          if (file) file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Failed to download ${curUrl}: Status Code ${response.statusCode}`));
        }

        file = fs.createWriteStream(destPath);
        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            isFinished = true;
            resolve();
          });
        });

        file.on('error', (err) => {
          if (!isFinished) {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
          }
        });
      });

      request.on('error', (err) => {
        if (!isFinished) {
          if (file) file.close();
          fs.unlink(destPath, () => {});
          reject(err);
        }
      });

      request.end();
    };

    doReq(url);
  });
}

/**
 * Helper to fetch text content
 */
function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) smilk-launcher', ...headers }
    };
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, headers).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch text: Status Code ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

/**
 * Runs a command asynchronously
 */
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}. Stderr: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Resolves shared game data directories (game_data/assets, game_data/libraries, game_data/versions)
 */
function getSharedGameData(instanceDir) {
  const sharedRoot = path.resolve(instanceDir, '../..'); // %APPDATA%/smilk-launcher/game_data
  return {
    root: sharedRoot,
    assets: path.join(sharedRoot, 'assets'),
    libraries: path.join(sharedRoot, 'libraries'),
    versions: path.join(sharedRoot, 'versions')
  };
}

/**
 * Recursively copies a directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (e) {}
      }
    }
  }
}

/**
 * Migrates legacy instance-specific assets, libraries, and versions into shared directories
 */
function migrateLegacyInstanceFiles(instanceDir, shared) {
  const legacyAssets = path.join(instanceDir, 'assets');
  if (fs.existsSync(legacyAssets)) {
    try {
      copyDirRecursive(legacyAssets, shared.assets);
      console.log(`Migrated legacy assets from ${instanceDir} to shared ${shared.assets}`);
      try { fs.rmSync(legacyAssets, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
      console.warn('Failed migrating legacy assets:', e.message);
    }
  }

  const legacyLibs = path.join(instanceDir, 'libraries');
  if (fs.existsSync(legacyLibs)) {
    try {
      copyDirRecursive(legacyLibs, shared.libraries);
      console.log(`Migrated legacy libraries from ${instanceDir} to shared ${shared.libraries}`);
      try { fs.rmSync(legacyLibs, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
      console.warn('Failed migrating legacy libraries:', e.message);
    }
  }

  const legacyVersions = path.join(instanceDir, 'versions');
  if (fs.existsSync(legacyVersions)) {
    try {
      copyDirRecursive(legacyVersions, shared.versions);
      console.log(`Migrated legacy versions from ${instanceDir} to shared ${shared.versions}`);
      try { fs.rmSync(legacyVersions, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
      console.warn('Failed migrating legacy versions:', e.message);
    }
  }
}

/**
 * Resolves the canonical Mojang assetIndex (e.g. "17" for Minecraft 1.21.1) following inheritsFrom,
 * downloads assets/indexes/<id>.json, and creates compatibility aliases (<mcVersion>.json, <loader>.json).
 */
async function resolveAndPrepareAssetIndex(shared, customVersionId, mcVersion, sendProgress) {
  fs.mkdirSync(path.join(shared.assets, 'indexes'), { recursive: true });
  fs.mkdirSync(path.join(shared.versions, mcVersion), { recursive: true });

  let vanillaJson = null;
  const vanillaJsonPath = path.join(shared.versions, mcVersion, `${mcVersion}.json`);

  // 1. Try reading vanilla JSON if exists
  if (fs.existsSync(vanillaJsonPath)) {
    try {
      vanillaJson = JSON.parse(fs.readFileSync(vanillaJsonPath, 'utf8'));
    } catch (e) {}
  }

  // 2. If vanilla JSON missing or incomplete, fetch from Mojang version manifest
  if (!vanillaJson || !vanillaJson.assetIndex) {
    if (sendProgress) sendProgress({ status: 'downloading_assets', message: `Fetching version manifest for Minecraft ${mcVersion}...` });
    try {
      const manifestText = await fetchText('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      const manifest = JSON.parse(manifestText);
      const versionEntry = manifest.versions.find(v => v.id === mcVersion);
      if (versionEntry && versionEntry.url) {
        const vText = await fetchText(versionEntry.url);
        vanillaJson = JSON.parse(vText);
        fs.writeFileSync(vanillaJsonPath, vText, 'utf8');
        console.log(`Saved vanilla version JSON for ${mcVersion} to ${vanillaJsonPath}`);

        // Also download client.jar if missing
        const vanillaJarPath = path.join(shared.versions, mcVersion, `${mcVersion}.jar`);
        if (!fs.existsSync(vanillaJarPath) && vanillaJson.downloads && vanillaJson.downloads.client && vanillaJson.downloads.client.url) {
          if (sendProgress) sendProgress({ status: 'downloading_assets', message: `Downloading Minecraft ${mcVersion} base client...` });
          await downloadFile(vanillaJson.downloads.client.url, vanillaJarPath);
          console.log(`Downloaded vanilla client jar to ${vanillaJarPath}`);
        }
      }
    } catch (err) {
      console.warn(`Failed fetching Mojang manifest for ${mcVersion}:`, err.message);
    }
  }

  // Fallback: Check custom loader JSON for inheritsFrom chain
  if ((!vanillaJson || !vanillaJson.assetIndex) && customVersionId) {
    const customJsonPath = path.join(shared.versions, customVersionId, `${customVersionId}.json`);
    if (fs.existsSync(customJsonPath)) {
      try {
        const customJson = JSON.parse(fs.readFileSync(customJsonPath, 'utf8'));
        if (customJson.assetIndex) {
          vanillaJson = customJson;
        }
      } catch (e) {}
    }
  }

  const assetIndexInfo = (vanillaJson && vanillaJson.assetIndex) ? vanillaJson.assetIndex : { id: mcVersion };
  const assetIndexId = String(assetIndexInfo.id || mcVersion);
  const targetIndexFile = path.join(shared.assets, 'indexes', `${assetIndexId}.json`);

  // Download the canonical asset index if missing or empty
  if (!fs.existsSync(targetIndexFile) || fs.statSync(targetIndexFile).size < 100) {
    if (assetIndexInfo.url) {
      if (sendProgress) sendProgress({ status: 'downloading_assets', message: `Downloading assets index (${assetIndexId})...` });
      console.log(`Downloading canonical asset index ${assetIndexId} from ${assetIndexInfo.url}`);
      await downloadFile(assetIndexInfo.url, targetIndexFile);
    }
  }

  // Create compatibility aliases in shared.assets/indexes:
  // e.g. 17.json -> 1.21.1.json and neoforge-21.1.257.json so any legacy references work seamlessly
  if (fs.existsSync(targetIndexFile)) {
    const aliases = [mcVersion];
    if (customVersionId && customVersionId !== assetIndexId && customVersionId !== mcVersion) {
      aliases.push(customVersionId);
    }
    for (const alias of aliases) {
      const aliasPath = path.join(shared.assets, 'indexes', `${alias}.json`);
      if (!fs.existsSync(aliasPath) || fs.statSync(aliasPath).size !== fs.statSync(targetIndexFile).size) {
        try {
          fs.copyFileSync(targetIndexFile, aliasPath);
          console.log(`Created asset index alias: ${alias}.json -> ${assetIndexId}.json`);
        } catch (e) {}
      }
    }
  }

  return {
    assetIndexId,
    assetIndexInfo,
    vanillaJson
  };
}

/**
 * Installs OptiFine standalone version profile JSON and libraries in shared storage
 */
async function installOptiFine(mcVersion, shared, sendProgress) {
  const optifineVer = mcVersion === '1.9.4' ? '1.9.4_HD_U_I5' : (mcVersion === '1.9' ? '1.9_HD_U_I5' : `${mcVersion}_HD_U_I5`);
  const customVersionId = `${mcVersion}-OptiFine_${optifineVer}`;
  const versionDir = path.join(shared.versions, customVersionId);
  const jsonPath = path.join(versionDir, `${customVersionId}.json`);
  const optifineLibDir = path.join(shared.libraries, 'optifine', 'OptiFine', optifineVer);
  const optifineJarPath = path.join(optifineLibDir, `OptiFine-${optifineVer}.jar`);

  if (!fs.existsSync(jsonPath) || !fs.existsSync(optifineJarPath)) {
    sendProgress({ status: 'installing_loader', message: `Downloading OptiFine ${mcVersion}...` });
    fs.mkdirSync(versionDir, { recursive: true });
    fs.mkdirSync(optifineLibDir, { recursive: true });

    const adUrl = `https://optifine.net/adloadx?f=OptiFine_${optifineVer}.jar`;
    const html = await fetchText(adUrl);
    const match = html.match(/href='(downloadx\?[^']+)'/);
    if (!match) {
      throw new Error('Could not parse OptiFine download URL');
    }
    const dlUrl = 'https://optifine.net/' + match[1];
    await downloadFile(dlUrl, optifineJarPath);

    try {
      const AdmZip = require('adm-zip');
      const lwDestDir = path.join(shared.libraries, 'net', 'minecraft', 'launchwrapper', '1.12');
      const lwDestPath = path.join(lwDestDir, 'launchwrapper-1.12.jar');
      fs.mkdirSync(lwDestDir, { recursive: true });

      const zip = new AdmZip(optifineJarPath);
      const entry = zip.getEntry('launchwrapper-of-2.2.jar') || zip.getEntries().find(e => e.entryName.includes('launchwrapper'));
      if (entry) {
        fs.writeFileSync(lwDestPath, zip.readFile(entry));
        console.log(`Extracted bundled LaunchWrapper from OptiFine to ${lwDestPath}`);
      }
    } catch (e) {
      console.warn('Failed to extract LaunchWrapper from OptiFine jar:', e);
    }

    const profileJson = {
      id: customVersionId,
      inheritsFrom: mcVersion,
      time: new Date().toISOString(),
      releaseTime: new Date().toISOString(),
      type: "release",
      mainClass: "net.minecraft.launchwrapper.Launch",
      minecraftArguments: "--username ${auth_player_name} --version ${version_name} --gameDir ${game_directory} --assetsDir ${assets_root} --assetIndex ${assets_index_name} --uuid ${auth_uuid} --accessToken ${auth_access_token} --userType ${user_type} --tweakClass optifine.OptiFineTweaker",
      libraries: [
        { name: `optifine:OptiFine:${optifineVer}` },
        { name: "net.minecraft:launchwrapper:1.12" }
      ]
    };
    fs.writeFileSync(jsonPath, JSON.stringify(profileJson, null, 2), 'utf8');
  }

  return customVersionId;
}

/**
 * Installs Fabric loader profile JSON in shared storage
 */
async function installFabric(mcVersion, loaderVersion, shared) {
  const customVersionId = `fabric-loader-${loaderVersion}-${mcVersion}`;
  const versionDir = path.join(shared.versions, customVersionId);
  const jsonPath = path.join(versionDir, `${customVersionId}.json`);
  const jarPath = path.join(versionDir, `${customVersionId}.jar`);

  if (fs.existsSync(jsonPath)) {
    return customVersionId;
  }

  fs.mkdirSync(versionDir, { recursive: true });

  const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
  console.log(`Downloading Fabric profile from ${profileUrl}`);
  
  const profileJsonText = await fetchText(profileUrl);
  fs.writeFileSync(jsonPath, profileJsonText, 'utf8');

  // Create dummy jar to prevent MCLC launcher issues
  const emptyZip = Buffer.from([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  fs.writeFileSync(jarPath, emptyZip);

  return customVersionId;
}

/**
 * Installs NeoForge into shared storage by running the official installer headlessly
 */
async function installNeoForge(mcVersion, neoforgeVersion, shared, javaPath, sendProgress) {
  const customVersionId = `neoforge-${neoforgeVersion}`;
  const versionDir = path.join(shared.versions, customVersionId);
  const jsonPath = path.join(versionDir, `${customVersionId}.json`);

  if (fs.existsSync(jsonPath)) {
    return customVersionId;
  }

  // Ensure launcher_profiles.json exists in shared root
  const profilesFile = path.join(shared.root, 'launcher_profiles.json');
  if (!fs.existsSync(profilesFile)) {
    fs.writeFileSync(profilesFile, JSON.stringify({ profiles: {} }, null, 2), 'utf8');
  }

  // Download neoforge installer to shared root
  const installerPath = path.join(shared.root, 'neoforge-installer.jar');
  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`;
  
  console.log(`Downloading NeoForge installer from ${installerUrl}`);
  sendProgress({ status: 'installing_loader', message: 'Downloading NeoForge installer...' });
  await downloadFile(installerUrl, installerPath);

  // Run installer command targeting shared.root
  sendProgress({ status: 'installing_loader', message: 'Installing NeoForge (this may take a minute)...' });
  const javaExec = javaPath || 'java';

  try {
    await runCommand(javaExec, ['-jar', installerPath, '--installClient', shared.root], { cwd: shared.root });
  } catch (err) {
    console.error('NeoForge installer execution failed:', err);
    throw new Error(`NeoForge installation failed: Ensure Java is installed and compatible. (${err.message})`);
  } finally {
    // Cleanup installer files
    try {
      if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath);
      const installerLog = path.join(shared.root, 'neoforge-installer.jar.log');
      if (fs.existsSync(installerLog)) fs.unlinkSync(installerLog);
    } catch (e) {
      console.warn('Failed to clean up installer files:', e);
    }
  }

  if (!fs.existsSync(jsonPath)) {
    throw new Error('NeoForge installer ran but did not generate the version JSON.');
  }

  return customVersionId;
}

/**
 * Installs Forge into shared storage by running the official installer headlessly
 */
async function installForge(mcVersion, forgeVersion, shared, javaPath, sendProgress) {
  const customVersionId = `${mcVersion}-forge-${forgeVersion}`;
  const versionDir = path.join(shared.versions, customVersionId);
  const jsonPath = path.join(versionDir, `${customVersionId}.json`);

  if (fs.existsSync(jsonPath)) {
    return customVersionId;
  }

  // Ensure launcher_profiles.json exists in shared root
  const profilesFile = path.join(shared.root, 'launcher_profiles.json');
  if (!fs.existsSync(profilesFile)) {
    fs.writeFileSync(profilesFile, JSON.stringify({ profiles: {} }, null, 2), 'utf8');
  }

  const installerPath = path.join(shared.root, 'forge-installer.jar');
  const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`;
  
  console.log(`Downloading Forge installer from ${installerUrl}`);
  sendProgress({ status: 'installing_loader', message: 'Downloading Forge installer...' });
  await downloadFile(installerUrl, installerPath);

  sendProgress({ status: 'installing_loader', message: 'Installing Forge (this may take a few minutes)...' });
  const javaExec = javaPath || 'java';

  try {
    await runCommand(javaExec, ['-jar', installerPath, '--installClient', shared.root], { cwd: shared.root });
  } catch (err) {
    console.error('Forge installer execution failed:', err);
    throw new Error(`Forge installation failed: Ensure Java is installed and compatible. (${err.message})`);
  } finally {
    try {
      if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath);
      const installerLog = path.join(shared.root, 'forge-installer.jar.log');
      if (fs.existsSync(installerLog)) fs.unlinkSync(installerLog);
    } catch (e) {
      console.warn('Failed to clean up installer files:', e);
    }
  }

  if (!fs.existsSync(jsonPath)) {
    throw new Error('Forge installer ran but did not generate the version JSON.');
  }

  return customVersionId;
}

function checkJavaVersion(javaPath, mcVersion) {
  return new Promise((resolve, reject) => {
    let targetJavaVersion = 21;
    let minJavaVersion = 8;
    let maxJavaVersion = 21;
    try {
      const parts = mcVersion.split('.');
      const mcMajor = parseInt(parts[0], 10);
      const mcMinor = parseInt(parts[1], 10);
      const mcPatch = parseInt(parts[2] || '0', 10);
      
      if (mcMajor === 26) {
        minJavaVersion = 25;
        maxJavaVersion = 25;
        targetJavaVersion = 25;
      } else if (mcMinor >= 21 || (mcMinor === 20 && mcPatch >= 5)) {
        minJavaVersion = 21;
        maxJavaVersion = 21;
        targetJavaVersion = 21;
      } else if (mcMinor >= 17) {
        minJavaVersion = 17;
        maxJavaVersion = 17;
        targetJavaVersion = 17;
      } else {
        minJavaVersion = 8;
        maxJavaVersion = 8;
        targetJavaVersion = 8;
      }
    } catch(e) {}
    
    const javaExeForCheck = javaPath.toLowerCase().endsWith('javaw.exe') 
      ? javaPath.replace(/javaw\.exe$/i, 'java.exe') 
      : (javaPath === 'javaw' ? 'java' : javaPath);

    exec(`"${javaExeForCheck}" -version`, (error, stdout, stderr) => {
      if (error) {
         const err = new Error(`Java was not found on your system.`);
         err.javaError = true;
         err.requiredVersion = targetJavaVersion;
         return reject(err);
      }
      const output = stderr || stdout;
      const match = output.match(/(?:java|openjdk) version "([^"]+)"/);
      if (match) {
        let versionStr = match[1];
        let major = 0;
        if (versionStr.startsWith('1.')) {
          major = parseInt(versionStr.split('.')[1], 10);
        } else {
          major = parseInt(versionStr.split('.')[0], 10);
        }
        
        if (major > 0 && major < minJavaVersion) {
          const err = new Error(`Minecraft ${mcVersion} requires Java ${minJavaVersion}, but you are using Java ${major}.`);
          err.javaError = true;
          err.requiredVersion = targetJavaVersion;
          return reject(err);
        }
        if (major > 0 && major > maxJavaVersion) {
          const err = new Error(`Minecraft ${mcVersion} requires Java ${targetJavaVersion} (mods like Cobblemon require Java ${targetJavaVersion}), but you are using Java ${major}.`);
          err.javaError = true;
          err.requiredVersion = targetJavaVersion;
          return reject(err);
        }
        
        resolve(major);
      } else {
        resolve(0);
      }
    });
  });
}

async function ensureJava(userDataPath, sendProgress, targetVersion = 21) {
  const javaDir = path.join(userDataPath, 'game_data', 'java', `jre-${targetVersion}`);
  
  function findJava(dir) {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findJava(fullPath);
        if (found) return found;
      } else if (entry.name.toLowerCase() === 'javaw.exe' || entry.name.toLowerCase() === 'java.exe') {
        return fullPath;
      }
    }
    return null;
  }

  const existingJava = findJava(javaDir);
  if (existingJava) {
    return existingJava;
  }

  sendProgress({ status: 'installing_java', message: `Downloading compatible Java ${targetVersion}... (this may take a minute)` });
  fs.mkdirSync(javaDir, { recursive: true });

  const zipPath = path.join(userDataPath, 'game_data', 'java', `jre-${targetVersion}.zip`);
  const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${targetVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`;
  
  await downloadFile(downloadUrl, zipPath);
  
  sendProgress({ status: 'installing_java', message: `Extracting Java ${targetVersion}...` });
  
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(javaDir, true);
  
  try {
    fs.unlinkSync(zipPath);
  } catch (e) {}

  const javaExe = findJava(javaDir);
  if (javaExe) {
    return javaExe;
  }
  
  throw new Error(`Failed to locate java.exe after extracting Java ${targetVersion}.`);
}

/**
 * Starts background watchdog on logs/latest.log to detect missing asset indexes, duplicate mods, and missing sounds.
 */
function startLogWatchdog(instanceDir, packKey, sendProgress, proc) {
  const logFile = path.join(instanceDir, 'logs', 'latest.log');
  const startTime = Date.now();
  const maxDurationMs = 75000; // Watch for 75 seconds after launch
  let warned = false;

  const interval = setInterval(() => {
    if (warned || Date.now() - startTime > maxDurationMs) {
      clearInterval(interval);
      return;
    }

    if (!fs.existsSync(logFile)) return;

    try {
      const content = fs.readFileSync(logFile, 'utf8');

      // Check 1: Can't open resource index file
      if (content.includes("Can't open the resource index file")) {
        warned = true;
        clearInterval(interval);
        console.warn('[Log Watchdog] Resource index error detected in latest.log!');
        sendProgress({
          status: 'diagnostic_warning',
          warningType: 'assets_missing',
          title: 'Missing Game Resources Detected',
          message: 'The game reported an error reading asset indexes. Vanilla sounds, languages, or menu textures may be missing.',
          packKey: packKey
        });
        return;
      }

      // Check 2: Found duplicate mods
      if (content.includes("Found duplicate mods") || content.includes("DuplicateModsFoundException")) {
        warned = true;
        clearInterval(interval);
        console.warn('[Log Watchdog] Duplicate mods detected in latest.log!');
        sendProgress({
          status: 'diagnostic_warning',
          warningType: 'duplicate_mods',
          title: 'Duplicate Mods Detected',
          message: 'The game found duplicate mods with identical IDs in your mods folder.',
          packKey: packKey
        });
        return;
      }

      // Check 3: Missing sound for event (> 10 occurrences)
      const missingSoundMatches = content.match(/Missing sound for event/g);
      if (missingSoundMatches && missingSoundMatches.length > 10) {
        warned = true;
        clearInterval(interval);
        console.warn(`[Log Watchdog] Detected ${missingSoundMatches.length} missing sounds in latest.log!`);
        sendProgress({
          status: 'diagnostic_warning',
          warningType: 'sound_errors',
          title: 'Missing Sounds Detected',
          message: `The game detected ${missingSoundMatches.length} missing sounds. The sound assets index or objects may be incomplete.`,
          packKey: packKey
        });
        return;
      }
    } catch (e) {
      // File may be locked by game process temporarily, retry next cycle
    }
  }, 2500);

  if (proc) {
    proc.on('close', () => {
      clearInterval(interval);
    });
  }
}

/**
 * Launches Minecraft using minecraft-launcher-core with shared game data and canonical assetIndex
 */
async function launchMinecraft(instanceDir, nickname, ramGb, javaPath, jvmArgs, mcVersion, loaderString, sendProgress, packKey = 'default') {
  let customVersionId = null;

  // Resolve shared game data paths
  const shared = getSharedGameData(instanceDir);
  migrateLegacyInstanceFiles(instanceDir, shared);

  // Determine correct java executable to avoid console window popup
  let finalJavaPath = javaPath;
  if (!finalJavaPath) {
    finalJavaPath = process.platform === 'win32' ? 'javaw' : 'java';
  } else if (process.platform === 'win32' && finalJavaPath.toLowerCase().endsWith('java.exe')) {
    finalJavaPath = finalJavaPath.replace(/java\.exe$/i, 'javaw.exe');
  }

  // Check Java version
  sendProgress({ status: 'checking', message: 'Checking Java version...' });
  try {
    await checkJavaVersion(finalJavaPath, mcVersion);
  } catch (err) {
    if (err.javaError) {
      const targetVersion = err.requiredVersion || 21;
      console.log(`Java check failed, attempting to auto-install Java ${targetVersion}:`, err.message);
      try {
        const userDataPath = path.resolve(instanceDir, '../../..');
        finalJavaPath = await ensureJava(userDataPath, sendProgress, targetVersion);
        console.log(`Successfully installed and using portable Java ${targetVersion}:`, finalJavaPath);
      } catch (installErr) {
        throw new Error(`${err.message} (Auto-install failed: ${installErr.message})`);
      }
    } else {
      throw err;
    }
  }

  // Process loader (installed into shared storage)
  if (loaderString && loaderString.startsWith('fabric-')) {
    const loaderVersion = loaderString.substring('fabric-'.length);
    sendProgress({ status: 'installing_loader', message: 'Preparing Fabric Loader...' });
    customVersionId = await installFabric(mcVersion, loaderVersion, shared);
  } else if (loaderString && loaderString.startsWith('neoforge-')) {
    const neoforgeVersion = loaderString.substring('neoforge-'.length);
    sendProgress({ status: 'installing_loader', message: 'Preparing NeoForge Loader...' });
    customVersionId = await installNeoForge(mcVersion, neoforgeVersion, shared, finalJavaPath, sendProgress);
  } else if (loaderString && loaderString.startsWith('forge-')) {
    const forgeVersion = loaderString.substring('forge-'.length);
    sendProgress({ status: 'installing_loader', message: 'Preparing Forge Loader...' });
    customVersionId = await installForge(mcVersion, forgeVersion, shared, finalJavaPath, sendProgress);
  } else if (loaderString && loaderString.startsWith('optifine')) {
    sendProgress({ status: 'installing_loader', message: 'Preparing OptiFine Loader...' });
    customVersionId = await installOptiFine(mcVersion, shared, sendProgress);
  }

  // Resolve canonical assetIndex
  sendProgress({ status: 'downloading_assets', message: 'Preparing asset indexes and resources...' });
  const { assetIndexId, vanillaJson } = await resolveAndPrepareAssetIndex(shared, customVersionId, mcVersion, sendProgress);

  sendProgress({ status: 'launching', message: 'Launching Minecraft...' });

  const launcher = new Client();
  const memoryMax = `${ramGb}G`;

  // Parse custom jvm args
  let customArgs = [];
  if (jvmArgs && jvmArgs.trim()) {
    customArgs = jvmArgs.trim().split(/\s+/);
  }

  // If a custom loader JSON exists (e.g. NeoForge / Forge), extract arguments.jvm that MCLC ignores
  if (customVersionId) {
    const customJsonPath = path.join(shared.versions, customVersionId, `${customVersionId}.json`);
    if (fs.existsSync(customJsonPath)) {
      try {
        const customJson = JSON.parse(fs.readFileSync(customJsonPath, 'utf8'));
        if (customJson.arguments && Array.isArray(customJson.arguments.jvm)) {
          const libDir = shared.libraries;
          const sep = process.platform === 'win32' ? ';' : ':';
          const versionDir = path.join(shared.versions, customVersionId);
          
          for (const arg of customJson.arguments.jvm) {
            if (typeof arg === 'string') {
              const expanded = arg
                .replace(/\$\{library_directory\}/g, libDir)
                .replace(/\$\{classpath_separator\}/g, sep)
                .replace(/\$\{version_name\}/g, customVersionId)
                .replace(/\$\{natives_directory\}/g, path.join(versionDir, 'natives'));
              customArgs.push(expanded);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse custom version JSON jvm arguments:', e);
      }
    }
  }

  const opts = {
    authorization: Authenticator.getAuth(nickname || 'Player'),
    root: shared.root,
    version: {
      number: mcVersion,
      type: 'release',
      ...(customVersionId ? { custom: customVersionId } : {})
    },
    memory: {
      max: memoryMax,
      min: '1G'
    },
    javaPath: finalJavaPath,
    ...(customArgs.length ? { customArgs: customArgs } : {}),
    overrides: {
      gameDirectory: instanceDir,
      cwd: instanceDir,
      assetRoot: shared.assets,
      libraryRoot: shared.libraries,
      directory: path.join(shared.versions, customVersionId || mcVersion),
      assetIndex: assetIndexId
    }
  };

  console.log('Launching MCLC with shared assets & canonical index:', JSON.stringify({
    ...opts,
    authorization: { name: opts.authorization.name }
  }, null, 2));

  // Event Listeners for launcher
  launcher.on('debug', (e) => {
    console.log('[MCLC Debug]', e);
  });

  launcher.on('data', (e) => {
    sendProgress({ status: 'game_running', message: e.trim() });
  });

  launcher.on('progress', (e) => {
    const percent = (e.total && e.total > 0) ? Math.round((e.task / e.total) * 100) : 0;
    sendProgress({
      status: 'downloading_assets',
      message: `Verifying game files: ${e.type} (${e.task}/${e.total})`,
      progress: percent
    });
  });

  try {
    if (customVersionId) {
      // Ensure vanilla base jar exists in shared storage
      const vanillaJarPath = path.join(shared.versions, mcVersion, `${mcVersion}.jar`);
      if (!fs.existsSync(vanillaJarPath)) {
        if (vanillaJson && vanillaJson.downloads && vanillaJson.downloads.client && vanillaJson.downloads.client.url) {
          sendProgress({ status: 'downloading_assets', message: 'Downloading vanilla Minecraft base client...' });
          await downloadFile(vanillaJson.downloads.client.url, vanillaJarPath);
        } else {
          // Fallback trick
          const vanillaOpts = { ...opts };
          vanillaOpts.version = { number: mcVersion, type: 'release' };
          vanillaOpts.customArgs = ['-version'];
          const vanillaLauncher = new Client();
          try {
            const vanillaProc = await vanillaLauncher.launch(vanillaOpts);
            await new Promise((resolve) => vanillaProc.on('close', resolve));
          } catch (e) {
            console.warn('Vanilla preload error (ignored):', e);
          }
        }
      }

      // Fabric & NeoForge require vanilla jar in classpath; copy if missing
      if (!customVersionId.includes('OptiFine')) {
        const customJarPath = path.join(shared.versions, customVersionId, `${customVersionId}.jar`);
        if (fs.existsSync(vanillaJarPath) && !fs.existsSync(customJarPath)) {
          fs.copyFileSync(vanillaJarPath, customJarPath);
        }
      }
    }

    sendProgress({ status: 'launching', message: 'Launching modded client...' });
    const proc = await launcher.launch(opts);
    
    sendProgress({ status: 'game_started', message: 'Game started! You can close the launcher or play.' });
    
    // Start log watchdog
    startLogWatchdog(instanceDir, packKey, sendProgress, proc);

    proc.on('close', (code) => {
      console.log(`Minecraft exited with code ${code}`);
      if (code !== 0) {
        sendProgress({ status: 'game_crashed', code: code, instanceDir: instanceDir, message: `Minecraft crashed with code ${code}` });
      } else {
        sendProgress({ status: 'game_exited', message: `Minecraft exited gracefully (code ${code})` });
      }
    });
  } catch (err) {
    console.error('Launch failed:', err);
    throw new Error(`Launch failed: ${err.message}`);
  }
}

/**
 * Verifies and repairs a profile's assets, libraries, client.jar, and modpack files without deleting user files.
 */
async function repairProfile(instanceDir, packKey, sendProgress, options = {}) {
  const shared = getSharedGameData(instanceDir);
  migrateLegacyInstanceFiles(instanceDir, shared);

  sendProgress({ status: 'repairing', message: 'Reading profile configuration...', progress: 5 });

  const localVersionFile = path.join(instanceDir, 'local_version.json');
  let localConfig = {};
  if (fs.existsSync(localVersionFile)) {
    try {
      localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
    } catch (e) {}
  }

  const mcVersion = options.mcVersion || localConfig.minecraft || '1.21.1';
  const loaderString = options.loader || localConfig.loader || '';

  sendProgress({ status: 'repairing', message: 'Verifying asset index and vanilla files...', progress: 15 });

  let customVersionId = null;
  if (loaderString.startsWith('neoforge-')) {
    customVersionId = `neoforge-${loaderString.substring('neoforge-'.length)}`;
  } else if (loaderString.startsWith('forge-')) {
    customVersionId = `${mcVersion}-forge-${loaderString.substring('forge-'.length)}`;
  } else if (loaderString.startsWith('fabric-')) {
    customVersionId = `fabric-loader-${loaderString.substring('fabric-'.length)}-${mcVersion}`;
  } else if (loaderString.startsWith('optifine')) {
    customVersionId = `${mcVersion}-OptiFine_${mcVersion}_HD_U_I5`;
  }

  // 1. Resolve asset index
  const { assetIndexId, vanillaJson } = await resolveAndPrepareAssetIndex(shared, customVersionId, mcVersion, sendProgress);

  // 2. Verify vanilla client.jar
  const vanillaJarPath = path.join(shared.versions, mcVersion, `${mcVersion}.jar`);
  let needDownloadClient = !fs.existsSync(vanillaJarPath);
  if (!needDownloadClient && vanillaJson && vanillaJson.downloads && vanillaJson.downloads.client && vanillaJson.downloads.client.sha1) {
    const localJarSha1 = await getFileSha1(vanillaJarPath);
    if (localJarSha1 !== vanillaJson.downloads.client.sha1) {
      console.warn(`Vanilla client jar sha1 mismatch: expected ${vanillaJson.downloads.client.sha1}, got ${localJarSha1}`);
      needDownloadClient = true;
    }
  }
  if (needDownloadClient && vanillaJson && vanillaJson.downloads && vanillaJson.downloads.client && vanillaJson.downloads.client.url) {
    sendProgress({ status: 'repairing', message: `Downloading vanilla Minecraft ${mcVersion} client...`, progress: 25 });
    await downloadFile(vanillaJson.downloads.client.url, vanillaJarPath);
  }

  // 3. Verify loader jar
  if (customVersionId && !customVersionId.includes('OptiFine')) {
    const customJarPath = path.join(shared.versions, customVersionId, `${customVersionId}.jar`);
    if (fs.existsSync(vanillaJarPath) && !fs.existsSync(customJarPath)) {
      fs.copyFileSync(vanillaJarPath, customJarPath);
    }
  }

  // 4. Verify asset objects from index
  const indexFilePath = path.join(shared.assets, 'indexes', `${assetIndexId}.json`);
  if (fs.existsSync(indexFilePath)) {
    try {
      const indexObj = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
      const objects = indexObj.objects || {};
      const objectKeys = Object.keys(objects);
      const missingObjects = [];

      for (const key of objectKeys) {
        const item = objects[key];
        const hash = item.hash;
        const sub = hash.substring(0, 2);
        const objPath = path.join(shared.assets, 'objects', sub, hash);
        if (!fs.existsSync(objPath) || (item.size && fs.statSync(objPath).size !== item.size)) {
          missingObjects.push({ hash, sub, size: item.size });
        }
      }

      if (missingObjects.length > 0) {
        sendProgress({ status: 'repairing', message: `Restoring ${missingObjects.length} missing asset objects...`, progress: 35 });
        console.log(`Repair: Found ${missingObjects.length} missing asset objects out of ${objectKeys.length}`);
        
        let completed = 0;
        const limit = 8;
        for (let i = 0; i < missingObjects.length; i += limit) {
          const chunk = missingObjects.slice(i, i + limit);
          await Promise.all(chunk.map(async (m) => {
            const dest = path.join(shared.assets, 'objects', m.sub, m.hash);
            const url = `https://resources.download.minecraft.net/${m.sub}/${m.hash}`;
            try {
              await downloadFile(url, dest);
            } catch (err) {
              console.warn(`Failed downloading asset object ${m.hash}:`, err.message);
            }
          }));
          completed += chunk.length;
          const pct = 35 + Math.round((completed / missingObjects.length) * 35);
          sendProgress({ status: 'repairing', message: `Restoring assets (${completed}/${missingObjects.length})...`, progress: pct });
        }
      }
    } catch (e) {
      console.warn('Failed scanning asset index objects:', e);
    }
  }

  // 5. Verify modpack mods by sha1 if mrpack or URL is configured
  try {
    const { verifyModpackFilesBySha1 } = require('./updater');
    const mrpackUrl = options.configUrl || localConfig.mrpack_url;
    if (mrpackUrl && typeof verifyModpackFilesBySha1 === 'function') {
      sendProgress({ status: 'repairing', message: 'Verifying modpack files against manifest SHA-1...', progress: 75 });
      await verifyModpackFilesBySha1(instanceDir, mrpackUrl, sendProgress);
    }
  } catch (err) {
    console.warn('Modpack files verification error during repair:', err.message);
  }

  sendProgress({ status: 'ready', message: 'Profile verification and repair complete!', progress: 100 });
  return { success: true };
}

module.exports = {
  launchMinecraft,
  repairProfile,
  resolveAndPrepareAssetIndex,
  getSharedGameData,
  migrateLegacyInstanceFiles
};
