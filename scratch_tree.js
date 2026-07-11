const https = require('https');

async function test() {
  const configUrl = 'https://github.com/ddidif/submarinemilkkk/tree/vanilla+';
  let targetUrl = configUrl;
  let mrpackPath = null;
  let owner, repo, branch;

  const treeMatch = configUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/);
  if (treeMatch) {
    owner = treeMatch[1];
    repo = treeMatch[2];
    branch = treeMatch[3];
    const safeBranch = encodeURIComponent(decodeURIComponent(branch));
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${safeBranch}`;
    console.log("Fetching tree:", treeUrl);
    
    const treeRes = await new Promise((resolve, reject) => {
        https.get(treeUrl, { headers: { 'User-Agent': 'smilk-launcher' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
    
    if (treeRes && treeRes.tree) {
      const file = treeRes.tree.find(f => f.path.endsWith('.mrpack'));
      if (file) {
        mrpackPath = file.path;
        targetUrl = `https://github.com/${owner}/${repo}/raw/${branch}/${mrpackPath}`;
        console.log("Found .mrpack:", targetUrl);
      }
    }
  }
}

test();
