const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

/**
 * Helper to download a file with progress tracking and return a Promise
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;

    const doDownload = (currentUrl) => {
      const request = https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Follow redirect
          doDownload(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'], 10) || 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);
          if (onProgress && totalBytes > 0) {
            onProgress(downloadedBytes, totalBytes);
          }
        });

        response.on('end', () => {
          file.end(() => {
            resolve();
          });
        });
      });

      request.on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {}); // delete partial file on error
        reject(err);
      });
    };

    doDownload(url);

    file.on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
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
async function checkAndInstallUpdate(packKey, configUrl, instanceDir, sendProgress) {
  console.log(`Checking updates for ${packKey} from ${configUrl}`);
  sendProgress({ status: 'checking', message: 'Checking for updates...' });

  let remoteConfig;
  if (configUrl.endsWith('.mrpack')) {
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
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${filepath}&page=1&per_page=1`;
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
        
        remoteConfig = {
          version: match ? match[1] : 'github-raw-' + Date.now(),
          commitMessage,
          mrpack_url: configUrl
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

  // Compare version
  if (localConfig && localConfig.version === remoteConfig.version) {
    console.log(`${packKey} is up to date (${localConfig.version})`);
    sendProgress({ status: 'ready', message: `Ready to play (v${localConfig.version})`, config: localConfig });
    return localConfig;
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

  // 4. Clean mods and config folders
  sendProgress({ status: 'cleaning', message: 'Cleaning existing mods and config...' });
  const modsDir = path.join(instanceDir, 'mods');
  if (fs.existsSync(modsDir)) {
    fs.rmSync(modsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(modsDir, { recursive: true });

  const configDir = path.join(instanceDir, 'config');
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
  }
  fs.mkdirSync(configDir, { recursive: true });

  // 5. Download mods
  sendProgress({ status: 'downloading_mods', message: 'Downloading mods...', progress: 0 });
  
  const downloadTasks = filesToDownload.map((fileInfo) => {
    return async () => {
      const url = fileInfo.downloads[0];
      const relativePath = fileInfo.path; // e.g. "mods/sodium.jar"
      const destPath = path.join(instanceDir, relativePath);
      
      // Download single file
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

  // Write new local version config
  const finalConfig = {
    version: remoteConfig.version,
    commitMessage: remoteConfig.commitMessage,
    minecraft: remoteConfig.minecraft || indexJson.dependencies.minecraft,
    loader: remoteConfig.loader || (indexJson.dependencies['fabric-loader'] ? `fabric-${indexJson.dependencies['fabric-loader']}` : `forge-${indexJson.dependencies['forge']}`),
    mrpack_url: remoteConfig.mrpack_url
  };

  fs.writeFileSync(localVersionFile, JSON.stringify(finalConfig, null, 2), 'utf8');
  sendProgress({ status: 'ready', message: `Ready to play (v${finalConfig.version})`, config: finalConfig });

  return finalConfig;
}

module.exports = {
  checkAndInstallUpdate
};
