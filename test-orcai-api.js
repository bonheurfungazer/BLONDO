const http = require('https');
const options = {
  hostname: 'cc.orcai.cc',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(JSON.stringify({
  model: "gemini-2.5-flash-lite",
  messages: [{role: "user", content: "hello"}]
}));
req.end();
