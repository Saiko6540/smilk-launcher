const https = require('https');

const postData = new URLSearchParams({
  'content': 'Test Minecraft log content\nError: something broke!'
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

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
