const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

async function testJavaInstall() {
  const requiredVersion = 21;
  const userDataPath = path.join(__dirname, 'test_userdata');
  const javaDir = path.join(userDataPath, 'game_data', 'java', `jre_${requiredVersion}`);
  
  if (fs.existsSync(javaDir)) {
    fs.rmSync(javaDir, { recursive: true, force: true });
  }
  fs.mkdirSync(javaDir, { recursive: true });

  const zipPath = path.join(javaDir, `jre_${requiredVersion}.zip`);
  const apiUrl = `https://api.adoptium.net/v3/binary/latest/${requiredVersion}/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk`;

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

  console.log("Extracting ZIP...");
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(javaDir, true);
  fs.unlinkSync(zipPath); 

  console.log("Finding javaw.exe...");
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

  console.log("SUCCESS! Found javaw.exe at:", newJavaPath);
  
  // Cleanup
  fs.rmSync(userDataPath, { recursive: true, force: true });
}

testJavaInstall().catch(console.error);
