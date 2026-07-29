const https = require('https');

const ZAPSIGN_TOKEN = '3424a328-d18b-41bf-916f-ed32fa8f9876ba77b651-4496-4df0-8bec-5a235bdfb5b7';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function makeRequest(method, path, body, callback) {
  const options = {
    hostname: 'api.zapsign.com.br',
    path: path,
    method: method,
    headers: {
      'Authorization': 'Token ' + ZAPSIGN_TOKEN,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { callback(null, res.statusCode, JSON.parse(data)); }
      catch(e) { callback(null, res.statusCode, data); }
    });
  });

  req.on('error', (e) => callback(e));
  if (body) req.write(JSON.stringify(body));
  req.end();
}

require('http').createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders());
    res.end();
    return;
  }

  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, corsHeaders());
    res.end(JSON.stringify({ status: 'ok', service: 'ZapSign Proxy - Dra. Jacqueline Rosa' }));
    return;
  }

  // Create document
  if (req.url === '/criar' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        makeRequest('POST', '/api/v1/docs/', payload, (err, status, data) => {
          if (err) {
            res.writeHead(500, corsHeaders());
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(status, corsHeaders());
          res.end(JSON.stringify(data));
        });
      } catch(e) {
        res.writeHead(400, corsHeaders());
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Check document status
  if (req.url.startsWith('/verificar/') && req.method === 'GET') {
    const token = req.url.replace('/verificar/', '');
    makeRequest('GET', '/api/v1/docs/' + token + '/', null, (err, status, data) => {
      if (err) {
        res.writeHead(500, corsHeaders());
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(status, corsHeaders());
      res.end(JSON.stringify(data));
    });
    return;
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: 'Not found' }));

}).listen(process.env.PORT || 3000, () => {
  console.log('ZapSign Proxy rodando na porta', process.env.PORT || 3000);
});
