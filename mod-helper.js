const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

/**
 * Calculates SHA-1 hex digest of a file on disk.
 */
function getFileSha1(filePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) return resolve(null);
    try {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Extracts mod metadata (modId, version, displayName) from a JAR file or Buffer.
 * Supports NeoForge (neoforge.mods.toml), Forge (mods.toml, mcmod.info), and Fabric/Quilt (fabric.mod.json).
 */
function getJarModInfo(jarPathOrBuffer) {
  const mods = [];
  try {
    const zip = typeof jarPathOrBuffer === 'string'
      ? new AdmZip(jarPathOrBuffer)
      : new AdmZip(jarPathOrBuffer);

    // 1. Check NeoForge / Forge mods.toml
    const tomlEntry = zip.getEntry('META-INF/neoforge.mods.toml') || zip.getEntry('META-INF/mods.toml');
    if (tomlEntry) {
      const text = zip.readAsText(tomlEntry);
      // Look for [[mods]] blocks and modId
      const modBlocks = text.split(/\[\[mods\]\]/i);
      for (let i = 1; i < modBlocks.length; i++) {
        const block = modBlocks[i];
        const idMatch = block.match(/modId\s*=\s*["']([^"']+)["']/i);
        const verMatch = block.match(/version\s*=\s*["']([^"']+)["']/i);
        const nameMatch = block.match(/displayName\s*=\s*["']([^"']+)["']/i);
        if (idMatch) {
          mods.push({
            modId: idMatch[1].trim().toLowerCase(),
            version: verMatch ? verMatch[1].trim() : 'unknown',
            displayName: nameMatch ? nameMatch[1].trim() : idMatch[1].trim(),
            loader: 'neoforge'
          });
        }
      }
      if (mods.length > 0) return mods;
    }

    // 2. Check Fabric fabric.mod.json
    const fabricEntry = zip.getEntry('fabric.mod.json');
    if (fabricEntry) {
      const json = JSON.parse(zip.readAsText(fabricEntry));
      if (json.id) {
        mods.push({
          modId: String(json.id).trim().toLowerCase(),
          version: json.version || 'unknown',
          displayName: json.name || json.id,
          loader: 'fabric'
        });
      }
      if (mods.length > 0) return mods;
    }

    // 3. Check Quilt quilt.mod.json
    const quiltEntry = zip.getEntry('quilt.mod.json');
    if (quiltEntry) {
      const json = JSON.parse(zip.readAsText(quiltEntry));
      if (json.quilt_loader && json.quilt_loader.id) {
        mods.push({
          modId: String(json.quilt_loader.id).trim().toLowerCase(),
          version: json.quilt_loader.version || 'unknown',
          displayName: json.quilt_loader.metadata?.name || json.quilt_loader.id,
          loader: 'quilt'
        });
      }
      if (mods.length > 0) return mods;
    }

    // 4. Check legacy mcmod.info
    const legacyEntry = zip.getEntry('mcmod.info');
    if (legacyEntry) {
      const parsed = JSON.parse(zip.readAsText(legacyEntry));
      const list = Array.isArray(parsed) ? parsed : (parsed.modList || []);
      for (const item of list) {
        if (item.modid) {
          mods.push({
            modId: String(item.modid).trim().toLowerCase(),
            version: item.version || 'unknown',
            displayName: item.name || item.modid,
            loader: 'forge'
          });
        }
      }
      if (mods.length > 0) return mods;
    }
  } catch (err) {
    // Non-mod jar or unreadable archive
  }
  return mods;
}

const builtinShadersCache = new Map();
const modsDirCache = new Map();

/**
 * Scans a directory of JAR files and maps modId -> metadata array.
 * Results are cached based on directory mtimeMs to avoid expensive rescans.
 */
function scanModsDirectory(modsDir) {
  const modMap = new Map();
  if (!fs.existsSync(modsDir)) return modMap;

  let stat;
  try {
    stat = fs.statSync(modsDir);
  } catch (e) {
    return modMap;
  }

  const cached = modsDirCache.get(modsDir);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.modMap;
  }

  let entries = [];
  try {
    entries = fs.readdirSync(modsDir);
  } catch (e) {
    return modMap;
  }

  for (const filename of entries) {
    if (!filename.toLowerCase().endsWith('.jar')) continue;
    const fullPath = path.join(modsDir, filename);
    try {
      if (fs.statSync(fullPath).isFile()) {
        const infoList = getJarModInfo(fullPath);
        for (const info of infoList) {
          info.filename = filename;
          info.fullPath = fullPath;
          if (!modMap.has(info.modId)) {
            modMap.set(info.modId, []);
          }
          modMap.get(info.modId).push(info);
        }
      }
    } catch (e) {}
  }

  modsDirCache.set(modsDir, { mtimeMs: stat.mtimeMs, modMap });
  return modMap;
}

/**
 * Checks if a specific modId is already present in modsDir.
 * Highly optimized: checks filename candidates first before falling back to full scan.
 */
function hasModId(modsDir, targetModId) {
  if (!fs.existsSync(modsDir)) return false;
  const normalizedTarget = targetModId.toLowerCase();

  // Fast path for shader mods
  if (normalizedTarget === 'iris' || normalizedTarget === 'oculus') {
    const instanceDir = path.dirname(modsDir);
    const info = getPackBuiltinModsInfo(instanceDir);
    return normalizedTarget === 'iris' ? info.hasIris : info.hasOculus;
  }

  // Fast check: inspect candidate JARs whose filenames contain the modId
  let entries = [];
  try {
    entries = fs.readdirSync(modsDir);
  } catch (e) {
    return false;
  }

  const candidates = entries.filter(f => {
    const lower = f.toLowerCase();
    return lower.endsWith('.jar') && lower.includes(normalizedTarget);
  });

  for (const filename of candidates) {
    const fullPath = path.join(modsDir, filename);
    try {
      const infoList = getJarModInfo(fullPath);
      if (infoList.some(info => info.modId === normalizedTarget)) {
        return true;
      }
    } catch (e) {}
  }

  // Fallback to cache-backed scan if not found in candidate filenames
  const map = scanModsDirectory(modsDir);
  return map.has(normalizedTarget);
}

/**
 * Returns structured information about whether shaders mods (Iris or Oculus) are built-in.
 * Highly optimized: inspects only candidate jar files and caches by directory mtimeMs.
 */
function getPackBuiltinModsInfo(instanceDir) {
  const modsDir = path.join(instanceDir, 'mods');
  if (!fs.existsSync(modsDir)) {
    return {
      hasIris: false,
      hasOculus: false,
      hasBuiltinShaders: false,
      irisVersion: null,
      oculusVersion: null,
      totalModsCount: 0
    };
  }

  let stat;
  try {
    stat = fs.statSync(modsDir);
  } catch (e) {
    return {
      hasIris: false,
      hasOculus: false,
      hasBuiltinShaders: false,
      irisVersion: null,
      oculusVersion: null,
      totalModsCount: 0
    };
  }

  const cached = builtinShadersCache.get(modsDir);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.result;
  }

  let entries = [];
  try {
    entries = fs.readdirSync(modsDir);
  } catch (e) {
    entries = [];
  }

  const jarFiles = entries.filter(f => f.toLowerCase().endsWith('.jar'));
  const candidates = jarFiles.filter(f => {
    const lower = f.toLowerCase();
    return (lower.includes('iris') || lower.includes('oculus')) && !lower.includes('iris-flw') && !lower.includes('irisflw');
  });

  let irisMod = null;
  let oculusMod = null;

  for (const filename of candidates) {
    const fullPath = path.join(modsDir, filename);
    try {
      const infoList = getJarModInfo(fullPath);
      for (const info of infoList) {
        if (info.modId === 'iris' && !irisMod) irisMod = info;
        if (info.modId === 'oculus' && !oculusMod) oculusMod = info;
      }
    } catch (e) {}
  }

  const result = {
    hasIris: !!irisMod,
    hasOculus: !!oculusMod,
    hasBuiltinShaders: !!irisMod || !!oculusMod,
    irisVersion: irisMod ? irisMod.version : null,
    oculusVersion: oculusMod ? oculusMod.version : null,
    totalModsCount: jarFiles.length
  };

  builtinShadersCache.set(modsDir, { mtimeMs: stat.mtimeMs, result });
  return result;
}

module.exports = {
  getJarModInfo,
  scanModsDirectory,
  hasModId,
  getPackBuiltinModsInfo,
  getFileSha1
};
