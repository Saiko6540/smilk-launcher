const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { hasModId, scanModsDirectory, getFileSha1 } = require('./mod-helper');

/**
 * Helper to download a file with progress tracking, redirect following, and robust error handling
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    let file = null;
    let isFinished = false;

    const doDownload = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 15) {
        if (file) file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Too many redirects downloading ${url}`));
      }

      let parsed;
      try {
        parsed = new URL(currentUrl);
      } catch (err) {
        if (file) file.close();
        fs.unlink(destPath, () => {});
        return reject(err);
      }

      const client = parsed.protocol === 'http:' ? http : https;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 smilk-launcher',
          'Accept': '*/*'
        }
      };

      const request = client.request(options, (response) => {
        // Handle Redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          let nextUrl = response.headers.location;
          if (!nextUrl.startsWith('http://') && !nextUrl.startsWith('https://')) {
            nextUrl = new URL(nextUrl, currentUrl).href;
          }
          response.resume();
          return doDownload(nextUrl, redirectCount + 1);
        }

        if (response.statusCode !== 200) {
          response.resume();
          if (file) file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Failed to download ${currentUrl}: HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;

        file = fs.createWriteStream(destPath);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);
          if (onProgress && totalBytes > 0) {
            onProgress(downloadedBytes, totalBytes);
          }
        });

        response.on('end', () => {
          file.end(() => {
            isFinished = true;
            resolve();
          });
        });

        response.on('error', (err) => {
          if (!isFinished) {
            if (file) file.close();
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

    doDownload(url);
  });
}

/**
 * Helper to fetch JSON from URL
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch JSON: Status Code ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

/**
 * Concurrency-controlled promise runner
 */
async function asyncQueue(tasks, limit, onProgress) {
  const results = [];
  const executing = new Set();
  let completed = 0;

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);

    const clean = () => {
      executing.delete(p);
      completed++;
      if (onProgress) onProgress(completed, tasks.length);
    };
    p.then(clean, clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

/**
 * Main update routine
 */
async function checkAndInstallUpdate(packKey, configUrl, instanceDir, sendProgress, settings = {}) {
  console.log(`Checking updates for ${packKey} from ${configUrl}`);
  sendProgress({ status: 'checking', message: 'Checking for updates...' });

  const targetShaders = (settings.addons && settings.addons[packKey] && settings.addons[packKey].shaders !== undefined) ? settings.addons[packKey].shaders : false;

  // --- VANILLA / NO-MRPACK MODE ---
  if (configUrl === 'vanilla') {
    const finalConfig = {
      version: '1.0.0',
      packVersion: '1.0.0',
      commitMessage: 'Vanilla/Optifine Instance',
      minecraft: settings.mcVersion || '1.9',
      loader: settings.loader || 'optifine-1.9',
      addons: { shaders: targetShaders }
    };
    
    fs.mkdirSync(instanceDir, { recursive: true });
    
    if (settings.extraMods && Array.isArray(settings.extraMods)) {
      sendProgress({ status: 'downloading_mods', message: 'Downloading extra mods...', progress: 0 });
      const modsDir = path.join(instanceDir, 'mods');
      fs.mkdirSync(modsDir, { recursive: true });
      for (let i = 0; i < settings.extraMods.length; i++) {
        const modUrl = settings.extraMods[i];
        const fileName = modUrl.substring(modUrl.lastIndexOf('/') + 1) || `mod_${i}.jar`;
        const destPath = path.join(modsDir, decodeURIComponent(fileName));
        try {
          if (!fs.existsSync(destPath)) {
            await downloadFile(modUrl, destPath);
          }
        } catch (e) {
          console.warn('Failed to download extra mod:', modUrl, e);
        }
        sendProgress({ status: 'downloading_mods', message: `Downloading extra mods (${i+1}/${settings.extraMods.length})`, progress: Math.round(((i+1)/settings.extraMods.length)*100) });
      }
    }

    const localVersionFile = path.join(instanceDir, 'local_version.json');
    fs.writeFileSync(localVersionFile, JSON.stringify(finalConfig, null, 2), 'utf8');
    
    console.log(`Initialized vanilla instance for ${packKey}`);
    sendProgress({ status: 'ready', message: `Ready to play (Vanilla)`, config: finalConfig });
    return finalConfig;
  }
  // --------------------------------

  let remoteConfig;

  let branchOptionsUrl = null;
  let branchServersUrl = null;

  // Dynamic Auto-resolve for any GitHub URL (branch/tree/raw) to find whatever .mrpack file exists on that branch
  const ghMatch = configUrl.match(/(?:github\.com\/([^\/]+)\/([^\/]+)\/(?:tree|raw)\/([^\/]+))|(?:raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+))/);
  if (ghMatch) {
    try {
      const owner = ghMatch[1] || ghMatch[4];
      const repo = ghMatch[2] || ghMatch[5];
      const branch = ghMatch[3] || ghMatch[6];
      if (owner && repo && branch) {
        const safeBranch = encodeURIComponent(decodeURIComponent(branch));
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${safeBranch}?recursive=1`;
        
        const treeRes = await new Promise((resolve, reject) => {
          https.get(treeUrl, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
            });
          }).on('error', () => resolve(null));
        });
        
        if (treeRes && treeRes.tree && Array.isArray(treeRes.tree)) {
          const mrpackFile = treeRes.tree.find(f => f.path.toLowerCase().endsWith('.mrpack'));
          if (mrpackFile) {
            configUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${mrpackFile.path.split('/').map(encodeURIComponent).join('/')}`;
            console.log(`Auto-resolved branch '${branch}' .mrpack file to: ${configUrl}`);
          }
          if (treeRes.tree.some(f => f.path.toLowerCase() === 'options.txt')) {
            branchOptionsUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/options.txt`;
          }
          if (treeRes.tree.some(f => f.path.toLowerCase() === 'servers.dat')) {
            branchServersUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/servers.dat`;
          }
        } else {
          branchOptionsUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/options.txt`;
          branchServersUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/servers.dat`;
        }
      }
    } catch (err) {
      console.warn("Failed to auto-resolve branch URL for .mrpack file:", err);
    }
  }
  if (configUrl.split('?')[0].endsWith('.mrpack')) {
    try {
      if (configUrl.includes('github.com') || configUrl.includes('githubusercontent.com')) {
        const rawUrl = configUrl.replace('github.com', 'raw.githubusercontent.com').replace('/raw/', '/');
        const text = await new Promise((resolve, reject) => {
          https.get(rawUrl, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
        const match = text.match(/oid sha256:([a-f0-9]+)/);
        let commitMessage = null;
        const repoMatch = configUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/raw\/([^\/]+)\/(.+)/);
        if (repoMatch) {
          const [_, owner, repo, branch, filepath] = repoMatch;
          const safeBranch = encodeURIComponent(decodeURIComponent(branch));
          const safePath = encodeURIComponent(decodeURIComponent(filepath));
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${safePath}&sha=${safeBranch}&page=1&per_page=1`;
          try {
            const apiText = await new Promise((resolve, reject) => {
              https.get(apiUrl, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
              }).on('error', reject);
            });
            const json = JSON.parse(apiText);
            if (json && json.length > 0 && json[0].commit) {
              commitMessage = json[0].commit.message;
            }
          } catch(e) {}
        }

        let actualDownloadUrl = configUrl;
        if (match) {
          // It's a Git LFS file - convert to media.githubusercontent.com for full binary download
          const lfsMatch = configUrl.match(/github(?:usercontent)?\.com\/(?:raw\/)?([^\/]+)\/([^\/]+)\/(?:raw\/)?([^\/]+)\/(.+)/);
          if (lfsMatch) {
            const [_, owner, repo, branch, filepath] = lfsMatch;
            actualDownloadUrl = `https://media.githubusercontent.com/media/${owner}/${repo}/${branch}/${filepath}`;
          }
        }
        
        remoteConfig = {
          version: match ? match[1] : 'github-raw-' + Date.now(),
          commitMessage,
          mrpack_url: actualDownloadUrl
        };
      } else {
        remoteConfig = {
          version: 'custom-' + Date.now(),
          mrpack_url: configUrl
        };
      }
    } catch (err) {
      console.warn('Failed to fetch github mrpack info, forcing update.', err);
      remoteConfig = { version: 'github-raw-' + Date.now(), mrpack_url: configUrl };
    }
  } else {
    try {
      remoteConfig = await fetchJson(configUrl);
    } catch (err) {
      console.error('Update check failed:', err);
      throw new Error('Unable to connect to updates server. Please verify your internet connection.');
    }
  }

  if (remoteConfig) {
    remoteConfig.branchOptionsUrl = branchOptionsUrl;
    remoteConfig.branchServersUrl = branchServersUrl;
  }

  // Get local version
  const localVersionFile = path.join(instanceDir, 'local_version.json');
  let localConfig = null;
  if (fs.existsSync(localVersionFile)) {
    try {
      localConfig = JSON.parse(fs.readFileSync(localVersionFile, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse local version file, forcing update.');
    }
  }

  // Compare version and addons state
  const localShaders = localConfig?.addons?.shaders || false;

  if (localConfig && localConfig.version === remoteConfig.version) {
    // Backport missing versionId/commitMessage metadata retroactively
    let configUpdated = false;
    if (remoteConfig.commitMessage && localConfig.commitMessage !== remoteConfig.commitMessage) {
      localConfig.commitMessage = remoteConfig.commitMessage;
      configUpdated = true;
    }
    if (remoteConfig.commitMessage && !localConfig.packVersion) {
      const cleanVerMatch = remoteConfig.commitMessage.trim().match(/^v?(\d+\.\d+(?:\.\d+)?)$/i);
      if (cleanVerMatch) {
        localConfig.packVersion = cleanVerMatch[1];
        configUpdated = true;
      }
    }
    if (configUpdated) {
      fs.writeFileSync(localVersionFile, JSON.stringify(localConfig, null, 2), 'utf8');
      console.log(`Retroactively updated local config metadata for ${packKey}`);
    }

    if (localShaders === targetShaders) {
      // Sync missing servers.dat or options.txt if provided on branch
      if (remoteConfig.branchServersUrl && !fs.existsSync(path.join(instanceDir, 'servers.dat'))) {
        try {
          await downloadFile(remoteConfig.branchServersUrl, path.join(instanceDir, 'servers.dat'));
          console.log(`Synced missing servers.dat for ${packKey}`);
        } catch (e) {
          console.warn('Failed to sync missing servers.dat:', e.message);
        }
      }
      if (remoteConfig.branchOptionsUrl && !fs.existsSync(path.join(instanceDir, 'options.txt'))) {
        try {
          await downloadFile(remoteConfig.branchOptionsUrl, path.join(instanceDir, 'options.txt'));
          console.log(`Synced missing options.txt for ${packKey}`);
        } catch (e) {
          console.warn('Failed to sync missing options.txt:', e.message);
        }
      }

      console.log(`${packKey} is up to date (${localConfig.version})`);
      sendProgress({ status: 'ready', message: `Ready to play (v${localConfig.packVersion || localConfig.version.substring(0, 7)})`, config: localConfig });
      return localConfig;
    } else {
      const modsDir = path.join(instanceDir, 'mods');
      fs.mkdirSync(modsDir, { recursive: true });

      // Check if pack has built-in Iris or Oculus
      const hasBuiltinShaders = packKey === 'pluto' || hasModId(modsDir, 'iris') || hasModId(modsDir, 'oculus');

      if (hasBuiltinShaders) {
        console.log(`Incremental shaders update for ${packKey} (built-in shaders detected). Toggling shaders to: ${targetShaders}`);
        const irisProp = path.join(instanceDir, 'config', 'iris.properties');
        if (fs.existsSync(irisProp)) {
          try {
            let irisContent = fs.readFileSync(irisProp, 'utf8');
            const replacement = targetShaders ? 'enableShaders=true' : 'enableShaders=false';
            irisContent = irisContent.replace(/enableShaders\s*=\s*(?:true|false)/g, replacement);
            fs.writeFileSync(irisProp, irisContent, 'utf8');
          } catch (e) {}
        }
        localConfig.addons = localConfig.addons || {};
        localConfig.addons.shaders = targetShaders;
        fs.writeFileSync(localVersionFile, JSON.stringify(localConfig, null, 2), 'utf8');
        sendProgress({ status: 'ready', message: `Ready to play (v${localConfig.packVersion || localConfig.version.substring(0, 7)})`, config: localConfig });
        return localConfig;
      }

      // Version matches, but shaders state has changed for non-builtin modpack! Let's do an incremental update.
      console.log(`Incremental shaders update for ${packKey}. Toggling addon shaders to: ${targetShaders}`);

      if (targetShaders) {
        // Enable: download shaders mod
        sendProgress({ status: 'extracting', message: 'Enabling shaders support...' });
        const mcVersion = remoteConfig.minecraft || localConfig.minecraft;
        const loader = remoteConfig.loader || localConfig.loader;
        const isFabric = loader.startsWith('fabric');
        const isNeoForge = loader.startsWith('neoforge');
        const modSlug = (isFabric || isNeoForge) ? 'iris' : 'oculus';
        const modLoader = isFabric ? 'fabric' : (isNeoForge ? 'neoforge' : 'forge');

        try {
          const versionsUrl = `https://api.modrinth.com/v2/project/${modSlug}/version?loaders=["${modLoader}"]&game_versions=["${mcVersion}"]`;
          const versions = await fetchJson(versionsUrl);
          if (versions && versions.length > 0) {
            const releases = versions.filter(v => v.version_type === 'release');
            const latestVersion = releases.length > 0 ? releases[0] : versions[0];
            const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
            const destPath = path.join(modsDir, primaryFile.filename);

            sendProgress({ status: 'downloading_mods', message: `Downloading shaders support (${modSlug})...`, progress: 50 });
            await downloadFile(primaryFile.url, destPath);
            console.log(`Incremental Addon: Successfully downloaded ${modSlug} to ${destPath}`);
          }
        } catch (apiErr) {
          console.error('Failed to resolve shaders mod for incremental update:', apiErr);
          throw new Error('Failed to download shaders mod: ' + apiErr.message);
        }

        const irisProp = path.join(instanceDir, 'config', 'iris.properties');
        if (fs.existsSync(irisProp)) {
          try {
            let irisContent = fs.readFileSync(irisProp, 'utf8');
            irisContent = irisContent.replace(/enableShaders\s*=\s*false/g, 'enableShaders=true');
            fs.writeFileSync(irisProp, irisContent, 'utf8');
          } catch (e) {}
        }
      } else {
        // Disable: delete external shaders addon mod
        sendProgress({ status: 'cleaning', message: 'Disabling shaders support...' });
        if (fs.existsSync(modsDir)) {
          const files = fs.readdirSync(modsDir);
          for (const file of files) {
            const nameLower = file.toLowerCase();
            if ((nameLower.startsWith('iris') || nameLower.startsWith('oculus')) && nameLower.endsWith('.jar') && !nameLower.includes('compat')) {
              const filePath = path.join(modsDir, file);
              fs.unlinkSync(filePath);
              console.log(`Incremental Addon: Deleted shaders mod: ${filePath}`);
            }
          }
        }
        const irisProp = path.join(instanceDir, 'config', 'iris.properties');
        if (fs.existsSync(irisProp)) {
          try {
            let irisContent = fs.readFileSync(irisProp, 'utf8');
            irisContent = irisContent.replace(/enableShaders\s*=\s*true/g, 'enableShaders=false');
            fs.writeFileSync(irisProp, irisContent, 'utf8');
          } catch (e) {}
        }
        const optiShaders = path.join(instanceDir, 'optionsshaders.txt');
        if (fs.existsSync(optiShaders)) {
          try {
            let optiContent = fs.readFileSync(optiShaders, 'utf8');
            optiContent = optiContent.replace(/shaderPack=.*/g, 'shaderPack=OFF');
            fs.writeFileSync(optiShaders, optiContent, 'utf8');
          } catch (e) {}
        }
      }

      // Save updated shaders state locally
      localConfig.addons = localConfig.addons || {};
      localConfig.addons.shaders = targetShaders;
      fs.writeFileSync(localVersionFile, JSON.stringify(localConfig, null, 2), 'utf8');

      sendProgress({ status: 'ready', message: `Ready to play (v${localConfig.packVersion || localConfig.version.substring(0, 7)})`, config: localConfig });
      return localConfig;
    }
  }

  console.log(`Update found. Local: ${localConfig ? localConfig.version : 'none'}, Remote: ${remoteConfig.version}`);
  fs.mkdirSync(instanceDir, { recursive: true });

  // 2. Download mrpack
  const mrpackPath = path.join(instanceDir, 'pack.mrpack');
  sendProgress({ status: 'downloading_pack', message: 'Downloading modpack manifest...', progress: 0 });

  await downloadFile(remoteConfig.mrpack_url, mrpackPath, (bytes, total) => {
    const percent = Math.round((bytes / total) * 100);
    sendProgress({ status: 'downloading_pack', message: `Downloading modpack manifest (${percent}%)`, progress: percent });
  });

  // 3. Extract mrpack and read modrinth.index.json
  sendProgress({ status: 'extracting', message: 'Parsing modpack index...' });
  let zip;
  try {
    zip = new AdmZip(mrpackPath);
  } catch (err) {
    throw new Error('Modpack archive is corrupted. Please try again.');
  }

  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) {
    throw new Error('Invalid .mrpack file: modrinth.index.json missing.');
  }

  const indexJson = JSON.parse(zip.readAsText(indexEntry));
  const filesToDownload = indexJson.files || [];

  // Handle Shaders Addon dynamically (skip if pack already has Iris/Oculus bundled, e.g. Pluto)
  const modsDir = path.join(instanceDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });
  const hasIrisOnDisk = hasModId(modsDir, 'iris');
  const hasOculusOnDisk = hasModId(modsDir, 'oculus');
  const hasShaderInIncoming = filesToDownload.some(f => {
    const p = (f.path || '').toLowerCase();
    return (p.includes('iris') || p.includes('oculus')) && p.endsWith('.jar') && !p.includes('compat');
  }) || zip.getEntries().some(e => {
    const p = e.entryName.toLowerCase();
    return (p.includes('iris') || p.includes('oculus')) && p.endsWith('.jar') && !p.includes('compat');
  });

  const hasBuiltinShaders = packKey === 'pluto' || hasIrisOnDisk || hasOculusOnDisk || hasShaderInIncoming;

  if (targetShaders && !hasBuiltinShaders) {
    const mcVersion = remoteConfig.minecraft || indexJson.dependencies.minecraft;
    const loader = remoteConfig.loader || (indexJson.dependencies['fabric-loader'] ? `fabric-${indexJson.dependencies['fabric-loader']}` : (indexJson.dependencies['neoforge'] ? `neoforge-${indexJson.dependencies['neoforge']}` : `forge-${indexJson.dependencies['forge']}`));
    const isFabric = loader.startsWith('fabric');
    const isNeoForge = loader.startsWith('neoforge');
    // Minecraft 1.21.1 Fabric and NeoForge require Iris; Forge-based older packs use Oculus.
    const modSlug = (isFabric || isNeoForge) ? 'iris' : 'oculus';
    const modLoader = isFabric ? 'fabric' : (isNeoForge ? 'neoforge' : 'forge');

    sendProgress({ status: 'extracting', message: `Querying shaders support (${modSlug}) from Modrinth...` });
    try {
      const versionsUrl = `https://api.modrinth.com/v2/project/${modSlug}/version?loaders=["${modLoader}"]&game_versions=["${mcVersion}"]`;
      const versions = await fetchJson(versionsUrl);
      if (versions && versions.length > 0) {
        // Filter by release type to avoid beta/alpha versions requiring beta dependencies
        const releases = versions.filter(v => v.version_type === 'release');
        const latestVersion = releases.length > 0 ? releases[0] : versions[0];
        const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
        console.log(`Addon Shaders: Found compatible ${modSlug} version ${latestVersion.version_number} (${latestVersion.version_type})`);
        filesToDownload.push({
          path: `mods/${primaryFile.filename}`,
          hashes: {
            sha1: primaryFile.hashes.sha1,
            sha512: primaryFile.hashes.sha512
          },
          downloads: [primaryFile.url],
          fileSize: primaryFile.size
        });
      } else {
        console.warn(`No compatible Modrinth version found for ${modSlug} (MC: ${mcVersion}, Loader: ${modLoader})`);
      }
    } catch (apiErr) {
      console.error('Failed to resolve shaders mod from Modrinth:', apiErr.message);
    }
  }

  // 4. Safe sync using managed_files.json manifest (DO NOT delete mods_disabled or custom user mods)
  sendProgress({ status: 'cleaning', message: 'Syncing modpack files safely...' });
  const configDir = path.join(instanceDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });

  const managedManifestPath = path.join(instanceDir, 'managed_files.json');
  let oldManagedFiles = [];
  if (fs.existsSync(managedManifestPath)) {
    try {
      const manifestData = JSON.parse(fs.readFileSync(managedManifestPath, 'utf8'));
      if (Array.isArray(manifestData.files)) {
        oldManagedFiles = manifestData.files;
      }
    } catch (e) {
      console.warn('Failed to parse managed_files.json:', e);
    }
  }

  // Set of normalized relative paths in the new modpack version
  const newRelativePaths = new Set(filesToDownload.map(f => f.path.replace(/\\/g, '/')));

  // Remove ONLY previously-managed files that are no longer part of the new version
  for (const oldRelPath of oldManagedFiles) {
    const normalized = oldRelPath.replace(/\\/g, '/');
    if (!newRelativePaths.has(normalized)) {
      const fullOldPath = path.join(instanceDir, normalized);
      if (fs.existsSync(fullOldPath)) {
        try {
          fs.unlinkSync(fullOldPath);
          console.log(`[Safe Sync] Removed deprecated modpack file: ${normalized}`);
        } catch (e) {
          console.warn(`[Safe Sync] Failed to remove old managed file ${normalized}:`, e);
        }
      }
    }
  }

  // 5. Download mods
  sendProgress({ status: 'downloading_mods', message: 'Downloading mods...', progress: 0 });
  
  const downloadTasks = filesToDownload.map((fileInfo) => {
    return async () => {
      const url = fileInfo.downloads[0];
      const relativePath = fileInfo.path;
      const destPath = path.join(instanceDir, relativePath);
      
      // If file already exists and hash matches, skip re-download
      if (fs.existsSync(destPath) && fileInfo.hashes && fileInfo.hashes.sha1) {
        const localSha = await getFileSha1(destPath);
        if (localSha === fileInfo.hashes.sha1) {
          return;
        }
      }

      await downloadFile(url, destPath);
    };
  });

  // Run downloading with concurrency limit of 5
  await asyncQueue(downloadTasks, 5, (completed, total) => {
    const percent = Math.round((completed / total) * 100);
    sendProgress({
      status: 'downloading_mods',
      message: `Downloading mods (${completed}/${total})`,
      progress: percent
    });
  });

  // Save updated managed files manifest
  try {
    const newManagedList = Array.from(newRelativePaths);
    fs.writeFileSync(managedManifestPath, JSON.stringify({
      version: remoteConfig.version,
      packVersion: indexJson.versionId || '1.0.0',
      files: newManagedList,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save managed_files.json:', e);
  }

  // 6. Extract overrides
  sendProgress({ status: 'overrides', message: 'Installing configuration and overrides...' });
  const zipEntries = zip.getEntries();
  for (const entry of zipEntries) {
    const entryName = entry.entryName;
    
    // Check for overrides folders
    let isOverride = false;
    let targetRelativePath = '';
    
    if (entryName.startsWith('overrides/')) {
      isOverride = true;
      targetRelativePath = entryName.substring('overrides/'.length);
    } else if (entryName.startsWith('client-overrides/')) {
      isOverride = true;
      targetRelativePath = entryName.substring('client-overrides/'.length);
    }

    if (isOverride && targetRelativePath) {
      const destPath = path.join(instanceDir, targetRelativePath);
      if (entry.isDirectory) {
        fs.mkdirSync(destPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        
        // Preserve user customizations in existing iris.properties or flywheel config
        const normPath = targetRelativePath.replace(/\\/g, '/');
        if (normPath === 'config/iris.properties' && fs.existsSync(destPath)) {
          continue;
        }
        if (normPath === 'config/flywheel-client.toml' && fs.existsSync(destPath)) {
          continue;
        }

        fs.writeFileSync(destPath, entry.getData());
      }
    }
  }

  // Clean up downloaded mrpack
  try {
    fs.unlinkSync(mrpackPath);
  } catch (e) {
    console.warn('Failed to delete temp mrpack file:', e);
  }

  // Configure shaders and Flywheel defaults after extracting overrides
  const irisProp = path.join(instanceDir, 'config', 'iris.properties');
  if (fs.existsSync(irisProp) && !targetShaders) {
    try {
      let irisContent = fs.readFileSync(irisProp, 'utf8');
      irisContent = irisContent.replace(/enableShaders\s*=\s*true/g, 'enableShaders=false');
      fs.writeFileSync(irisProp, irisContent, 'utf8');
    } catch (e) {}
  }

  // For Pluto: ensure Flywheel instancing backend is preserved
  if (packKey === 'pluto') {
    const flwConfig = path.join(instanceDir, 'config', 'flywheel-client.toml');
    if (fs.existsSync(flwConfig)) {
      try {
        let flwContent = fs.readFileSync(flwConfig, 'utf8');
        if (!flwContent.includes('backend = "flywheel:instancing"')) {
          flwContent = flwContent.replace(/backend\s*=\s*".*"/g, 'backend = "flywheel:instancing"');
          fs.writeFileSync(flwConfig, flwContent, 'utf8');
          console.log('Ensured Flywheel instancing backend in config/flywheel-client.toml');
        }
      } catch (e) {}
    }
  }

  const optiShaders = path.join(instanceDir, 'optionsshaders.txt');
  if (fs.existsSync(optiShaders) && !targetShaders) {
    try {
      let optiContent = fs.readFileSync(optiShaders, 'utf8');
      optiContent = optiContent.replace(/shaderPack=.*/g, 'shaderPack=OFF');
      fs.writeFileSync(optiShaders, optiContent, 'utf8');
    } catch (e) {}
  }

  // 7. Sync branch options.txt and servers.dat if available in repository (only if not already created by user)
  if (remoteConfig.branchOptionsUrl) {
    const optionsDest = path.join(instanceDir, 'options.txt');
    if (!fs.existsSync(optionsDest)) {
      sendProgress({ status: 'overrides', message: 'Syncing options.txt from repository...' });
      try {
        await downloadFile(remoteConfig.branchOptionsUrl, optionsDest);
        console.log(`Successfully synced branch options.txt to ${optionsDest}`);
      } catch (err) {
        console.warn('Failed to sync branch options.txt:', err.message);
      }
    }
  }

  if (remoteConfig.branchServersUrl) {
    const serversDest = path.join(instanceDir, 'servers.dat');
    if (!fs.existsSync(serversDest)) {
      sendProgress({ status: 'overrides', message: 'Syncing servers.dat from repository...' });
      try {
        await downloadFile(remoteConfig.branchServersUrl, serversDest);
        console.log(`Successfully synced branch servers.dat to ${serversDest}`);
      } catch (err) {
        console.warn('Failed to sync branch servers.dat:', err.message);
      }
    }
  }

  // Detect loader from dependencies
  let detectedLoader = remoteConfig.loader;
  if (!detectedLoader) {
    if (indexJson.dependencies && indexJson.dependencies['neoforge']) {
      detectedLoader = `neoforge-${indexJson.dependencies['neoforge']}`;
    } else if (indexJson.dependencies && indexJson.dependencies['fabric-loader']) {
      detectedLoader = `fabric-${indexJson.dependencies['fabric-loader']}`;
    } else if (indexJson.dependencies && indexJson.dependencies['forge']) {
      detectedLoader = `forge-${indexJson.dependencies['forge']}`;
    } else if (indexJson.dependencies && indexJson.dependencies['quilt-loader']) {
      detectedLoader = `quilt-${indexJson.dependencies['quilt-loader']}`;
    } else {
      detectedLoader = 'vanilla';
    }
  }

  // Write new local version config
  const finalConfig = {
    version: remoteConfig.version,
    packVersion: indexJson.versionId || '1.0.0',
    commitMessage: remoteConfig.commitMessage,
    minecraft: remoteConfig.minecraft || (indexJson.dependencies && indexJson.dependencies.minecraft) || '1.21.1',
    loader: detectedLoader,
    mrpack_url: remoteConfig.mrpack_url,
    addons: {
      shaders: targetShaders
    }
  };

  fs.writeFileSync(localVersionFile, JSON.stringify(finalConfig, null, 2), 'utf8');
  sendProgress({ status: 'ready', message: `Ready to play (v${finalConfig.packVersion || finalConfig.version.substring(0, 7)})`, config: finalConfig });

  return finalConfig;
}

/**
 * Verifies modpack files against .mrpack manifest using SHA-1.
 * Re-downloads missing or corrupted mods without deleting user files.
 */
async function verifyModpackFilesBySha1(instanceDir, configUrl, sendProgress) {
  let actualMrpackUrl = configUrl;
  if (configUrl.includes('github.com') || configUrl.includes('githubusercontent.com')) {
    const ghMatch = configUrl.match(/github(?:usercontent)?\.com\/(?:raw\/)?([^\/]+)\/([^\/]+)\/(?:raw\/)?([^\/]+)\/(.+)/);
    if (ghMatch) {
      const [_, owner, repo, branch, filepath] = ghMatch;
      actualMrpackUrl = `https://media.githubusercontent.com/media/${owner}/${repo}/${branch}/${filepath}`;
    }
  }

  const tempPackPath = path.join(instanceDir, 'verify_temp.mrpack');
  if (sendProgress) sendProgress({ status: 'repairing', message: 'Fetching modpack manifest for verification...', progress: 78 });
  await downloadFile(actualMrpackUrl, tempPackPath);

  let zip;
  try {
    zip = new AdmZip(tempPackPath);
  } catch (e) {
    try { fs.unlinkSync(tempPackPath); } catch (err) {}
    throw new Error('Failed to open modpack manifest archive.');
  }

  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) {
    try { fs.unlinkSync(tempPackPath); } catch (err) {}
    throw new Error('Invalid .mrpack archive: missing modrinth.index.json');
  }

  const indexJson = JSON.parse(zip.readAsText(indexEntry));
  const files = indexJson.files || [];
  const modsDir = path.join(instanceDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });

  const filesToFix = [];
  for (const fileInfo of files) {
    const destPath = path.join(instanceDir, fileInfo.path);
    if (!fs.existsSync(destPath)) {
      filesToFix.push(fileInfo);
    } else if (fileInfo.hashes && fileInfo.hashes.sha1) {
      const currentSha1 = await getFileSha1(destPath);
      if (currentSha1 !== fileInfo.hashes.sha1) {
        console.warn(`SHA-1 mismatch for ${fileInfo.path}: expected ${fileInfo.hashes.sha1}, got ${currentSha1}`);
        filesToFix.push(fileInfo);
      }
    }
  }

  try { fs.unlinkSync(tempPackPath); } catch (err) {}

  if (filesToFix.length > 0) {
    if (sendProgress) sendProgress({ status: 'repairing', message: `Restoring ${filesToFix.length} mod files...`, progress: 85 });
    console.log(`Verify: Found ${filesToFix.length} files to repair`);
    
    let completed = 0;
    const downloadTasks = filesToFix.map(fileInfo => async () => {
      const destPath = path.join(instanceDir, fileInfo.path);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      await downloadFile(fileInfo.downloads[0], destPath);
      completed++;
      const pct = 85 + Math.round((completed / filesToFix.length) * 14);
      if (sendProgress) {
        sendProgress({
          status: 'repairing',
          message: `Restoring mods (${completed}/${filesToFix.length})...`,
          progress: pct
        });
      }
    });

    await asyncQueue(downloadTasks, 5);
  } else {
    console.log('Verify: All modpack files verified successfully with correct SHA-1.');
  }

  return { verified: true, fixedCount: filesToFix.length };
}

module.exports = {
  checkAndInstallUpdate,
  verifyModpackFilesBySha1
};
