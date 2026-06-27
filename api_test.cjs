const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Login
  const login = await request('POST', '/api/auth/login', {
    email: '1830225455@qq.com',
    password: '123456'
  });
  const token = login.body.data.token;
  console.log('Login:', login.status, login.body.message);

  // Test stats/summary
  console.log('\n--- Testing /api/daily-reports/stats/summary ---');
  const stats = await request('GET', '/api/daily-reports/stats/summary', null, token);
  console.log('Status:', stats.status);
  console.log('Response:', JSON.stringify(stats.body, null, 2));

  // Test GET /api/daily-reports
  console.log('\n--- Testing GET /api/daily-reports ---');
  const list = await request('GET', '/api/daily-reports', null, token);
  console.log('Status:', list.status);
  console.log('Total:', list.body && list.body.pagination ? list.body.pagination.total : 'N/A');

  // Test contribution
  console.log('\n--- Testing /api/contribution ---');
  const contrib = await request('GET', '/api/contribution', null, token);
  console.log('Status:', contrib.status);
  console.log('Data length:', contrib.body && contrib.body.data ? contrib.body.data.length : 'N/A');

  // Test git commits
  console.log('\n--- Testing /api/git/commits ---');
  const git = await request('GET', '/api/git/commits', null, token);
  console.log('Status:', git.status);
  var gitSuccess = git.body && git.body.success;
  console.log('Response:', gitSuccess ? 'success' : (git.body ? git.body.error : 'unknown'));

  // Test settings
  console.log('\n--- Testing /api/settings/project-path ---');
  const settings = await request('GET', '/api/settings/project-path', null, token);
  console.log('Status:', settings.status);
  console.log('Path:', settings.body && settings.body.data ? settings.body.data.project_path : 'N/A');

  // Test notes
  console.log('\n--- Testing /api/notes ---');
  const notes = await request('GET', '/api/notes', null, token);
  console.log('Status:', notes.status);

  // Test weekly reports
  console.log('\n--- Testing /api/weekly-reports ---');
  const weekly = await request('GET', '/api/weekly-reports', null, token);
  console.log('Status:', weekly.status);
}

main().catch(console.error);
