const https = require('https');
const apiUrl = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk';
https.get(apiUrl, (res) => {
  console.log(res.statusCode, res.headers.location);
});
