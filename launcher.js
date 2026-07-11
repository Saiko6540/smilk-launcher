const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, exec } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');

/**
 * Helper to download a file (used for loader downloading)
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Helper to fetch text content
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
 * Installs Fabric loader profile JSON
 */
async function installFabric(mcVersion, loaderVersion, instanceDir) {
  const customVersionId = `fabric-loader-${loaderVersion}-${mcVersion}`;
  const versionDir = path.join(instanceDir, 'versions', customVersionId);
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
  // Must be a valid zip format, otherwise Fabric LibClassifier throws ZipException: zip file is empty
  const emptyZip = Buffer.from([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  fs.writeFileSync(jarPath, emptyZip);

  return customVersionId;
}

/**
 * Installs Forge by running the official installer JAR headlessly
 */
async function installForge(mcVersion, forgeVersion, instanceDir, javaPath, sendProgress) {
  // Forge version directory name format e.g. "1.20.1-forge-47.2.0"
  const customVersionId = `${mcVersion}-forge-${forgeVersion}`;
  const versionDir = path.join(instanceDir, 'versions', customVersionId);
  const jsonPath = path.join(versionDir, `${customVersionId}.json`);

  if (fs.existsSync(jsonPath)) {
    return customVersionId;
  }

  // Download forge installer
  const installerPath = path.join(instanceDir, 'forge-installer.jar');
  const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`;
  
  console.log(`Downloading Forge installer from ${installerUrl}`);
  sendProgress({ status: 'installing_loader', message: 'Downloading Forge installer...' });
  await downloadFile(installerUrl, installerPath);

  // Run installer command
  sendProgress({ status: 'installing_loader', message: 'Installing Forge (this may take a few minutes)...' });
  const javaExec = javaPath || 'java';

  try {
    // --installClient takes the root directory of Minecraft
    await runCommand(javaExec, ['-jar', installerPath, '--installClient', instanceDir], { cwd: instanceDir });
  } catch (err) {
    console.error('Forge installer execution failed:', err);
    throw new Error(`Forge installation failed: Ensure Java is installed and compatible. (${err.message})`);
  } finally {
    // Cleanup installer files
    try {
      if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath);
      const installerLog = path.join(instanceDir, 'forge-installer.jar.log');
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
    let minJavaVersion = 8;
    try {
      const parts = mcVersion.split('.');
      const mcMinor = parseInt(parts[1], 10);
      const mcPatch = parseInt(parts[2] || '0', 10);
      
      if (mcMinor >= 21 || (mcMinor === 20 && mcPatch >= 5)) {
        minJavaVersion = 21;
      } else if (mcMinor >= 17) {
        minJavaVersion = 17;
      }
    } catch(e) {}
    
    const javaExeForCheck = javaPath.toLowerCase().endsWith('javaw.exe') 
      ? javaPath.replace(/javaw\.exe$/i, 'java.exe') 
      : (javaPath === 'javaw' ? 'java' : javaPath);

    exec(`"${javaExeForCheck}" -version`, (error, stdout, stderr) => {
      if (error) {
         const err = new Error(`Java was not found on your system.`);
         err.javaError = true;
         err.requiredVersion = minJavaVersion;
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
          const err = new Error(`Minecraft ${mcVersion} requires Java ${minJavaVersion} or later, but you are using Java ${major}.`);
          err.javaError = true;
          err.requiredVersion = minJavaVersion;
          return reject(err);
        }
        resolve(major);
      } else {
        // Could not parse, just resolve to allow launching
        resolve(0);
      }
    });
  });
}

/**
 * Launches Minecraft using minecraft-launcher-core
 */
async function launchMinecraft(instanceDir, nickname, ramGb, javaPath, jvmArgs, mcVersion, loaderString, sendProgress) {
  let customVersionId = null;

  // Determine correct java executable to avoid console window popup
  let finalJavaPath = javaPath;
  if (!finalJavaPath) {
    finalJavaPath = process.platform === 'win32' ? 'javaw' : 'java';
  } else if (process.platform === 'win32' && finalJavaPath.toLowerCase().endsWith('java.exe')) {
    // If user selected java.exe, try to quietly replace it with javaw.exe
    finalJavaPath = finalJavaPath.replace(/java\.exe$/i, 'javaw.exe');
  }

  // Check Java version
  sendProgress({ status: 'checking', message: 'Checking Java version...' });
  await checkJavaVersion(finalJavaPath, mcVersion);

  // Process loader
  if (loaderString && loaderString.startsWith('fabric-')) {
    const loaderVersion = loaderString.substring('fabric-'.length);
    sendProgress({ status: 'installing_loader', message: 'Preparing Fabric Loader...' });
    customVersionId = await installFabric(mcVersion, loaderVersion, instanceDir);
  } else if (loaderString && loaderString.startsWith('forge-')) {
    const forgeVersion = loaderString.substring('forge-'.length);
    sendProgress({ status: 'installing_loader', message: 'Preparing Forge Loader...' });
    customVersionId = await installForge(mcVersion, forgeVersion, instanceDir, javaPath, sendProgress);
  }

  sendProgress({ status: 'launching', message: 'Launching Minecraft...' });

  const launcher = new Client();
  const memoryMax = `${ramGb}G`;

  // Parse custom jvm args
  let customArgs = [];
  if (jvmArgs && jvmArgs.trim()) {
    customArgs = jvmArgs.trim().split(/\s+/);
  }

    const opts = {
      authorization: Authenticator.getAuth(nickname || 'Player'),
      root: instanceDir,
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
      ...(customArgs.length ? { customArgs: customArgs } : {})
    };

  console.log('Launching MCLC with options:', JSON.stringify({
    ...opts,
    authorization: { name: opts.authorization.name } // redact tokens/uuid
  }, null, 2));

  // Event Listeners for launcher
  launcher.on('debug', (e) => {
    console.log('[MCLC Debug]', e);
  });

  launcher.on('data', (e) => {
    // Game logs
    sendProgress({ status: 'game_running', message: e.trim() });
  });

  launcher.on('progress', (e) => {
    // Download progress of libraries/assets
    const percent = Math.round((e.task / e.total) * 100);
    sendProgress({
      status: 'downloading_assets',
      message: `Verifying game files: ${e.type} (${e.task}/${e.total})`,
      progress: percent
    });
  });

  // Start the launch process
  try {
    if (customVersionId) {
      // Trick MCLC into downloading vanilla game files first if they are missing
      const vanillaJarPath = path.join(instanceDir, 'versions', mcVersion, `${mcVersion}.jar`);
      if (!fs.existsSync(vanillaJarPath)) {
        sendProgress({ status: 'downloading_assets', message: 'Downloading vanilla Minecraft base files...' });
        
        const vanillaOpts = { ...opts };
        vanillaOpts.version = { number: mcVersion, type: 'release' };
        vanillaOpts.customArgs = ['-version']; // Java will immediately exit 0
        
        const { Client } = require('minecraft-launcher-core');
        const vanillaLauncher = new Client();
        
        // Forward progress events
        vanillaLauncher.on('progress', (e) => {
          const percent = Math.round((e.task / e.total) * 100);
          sendProgress({ status: 'downloading_assets', message: `Verifying base game files: ${e.type} (${e.task}/${e.total})`, progress: percent });
        });

        try {
          const vanillaProc = await vanillaLauncher.launch(vanillaOpts);
          await new Promise((resolve) => vanillaProc.on('close', resolve));
        } catch (e) {
          console.warn('Vanilla preload error (ignored):', e);
        }
      }

      // Fabric 0.16+ requires the vanilla jar in the classpath
      // MCLC doesn't automatically add it for custom profiles
      // Fix: copy the real vanilla jar over the dummy profile jar
      // MCLC will automatically append the custom profile jar to the classpath!
      const customJarPath = path.join(instanceDir, 'versions', customVersionId, `${customVersionId}.jar`);
      if (fs.existsSync(vanillaJarPath)) {
        fs.copyFileSync(vanillaJarPath, customJarPath);
      }
    }

    sendProgress({ status: 'launching', message: 'Launching modded client...' });
    const proc = await launcher.launch(opts);
    
    sendProgress({ status: 'game_started', message: 'Game started! You can close the launcher or play.' });
    
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

module.exports = {
  launchMinecraft
};
