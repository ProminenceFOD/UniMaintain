const http = require('https');

async function testRenderBackend() {
  console.log('=== Testing Render Backend API ===');

  // Step 1: Login as Janet Folakemi to get JWT token
  const postData = JSON.stringify({
    email: 'j.folakemi@university.edu',
    password: 'password123'
  });

  const req = http.request({
    hostname: 'unimaintain-backend.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Login Response Status:', res.statusCode);
      console.log('Login Response Body:', data);
      try {
        const parsed = JSON.parse(data);
        if (parsed.token) {
          testUpdateStatus(parsed.token);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    });
  });

  req.on('error', e => console.error('Login Request Error:', e));
  req.write(postData);
  req.end();
}

function testUpdateStatus(token) {
  console.log('\n--- Testing PUT /api/requests/MR-2026-012/status as Janet Folakemi ---');
  const postData = JSON.stringify({
    status: 'closed',
    note: 'Acknowledged and closed.'
  });

  const req = http.request({
    hostname: 'unimaintain-backend.onrender.com',
    port: 443,
    path: '/api/requests/MR-2026-012/status',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Update Status Response Code:', res.statusCode);
      console.log('Update Status Response Body:', data);
    });
  });

  req.on('error', e => console.error('Update Status Error:', e));
  req.write(postData);
  req.end();
}

testRenderBackend();
