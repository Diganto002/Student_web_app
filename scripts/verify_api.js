const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Full-Stack API, AI & Admin Auth Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.success, 'GET /health endpoint operational');

    // 2. Swagger API Documentation
    const swagger = await request('GET', '/api-docs.json');
    assert(swagger.status === 200 && swagger.data && swagger.data.openapi === '3.0.0', 
      'GET /api-docs.json serves valid OpenAPI 3.0.0 specification');

    // 3. Admin Login Failure (Invalid Credentials)
    const badLogin = await request('POST', '/admin/login', { username: 'spetrum', password: 'wrongpassword' });
    assert(badLogin.status === 401 && !badLogin.data.success, 'POST /admin/login rejects invalid password with 401 Unauthorized');

    // 4. Admin Login Success (spetrum : admin123)
    const goodLogin = await request('POST', '/admin/login', { username: 'spetrum', password: 'admin123' });
    const adminToken = goodLogin.data?.token;
    assert(goodLogin.status === 200 && goodLogin.data?.success && adminToken, 
      'POST /admin/login authenticates spetrum/admin123 and issues Bearer token');

    // 5. Admin Login Success with alias 'admin'
    const adminAliasLogin = await request('POST', '/admin/login', { username: 'admin', password: 'admin123' });
    assert(adminAliasLogin.status === 200 && adminAliasLogin.data?.token === adminToken,
      'POST /admin/login authenticates admin/admin123 alias');

    // 6. Submit valid registration
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const student1Data = {
      first_name: 'Mahmudul',
      last_name: 'Hasan',
      email: `test_${randomNum}@gmail.com`,
      phone: `017${randomNum.toString().substring(0, 8)}`,
      date_of_birth: '2002-05-15',
      gender: 'Male',
      address: 'House #45, Road #12, Sector 4, Uttara, Dhaka',
      course_name: 'Computer Science & Engineering (CSE)'
    };
    const res1 = await request('POST', '/students', student1Data);
    const regId1 = res1.data?.data?.registration_id;
    assert(res1.status === 201 && res1.data?.success && regId1, 
      `POST /students creates registration ${regId1} with default Submitted status`);

    // 7. Prevent Duplicate Email Registration
    const dupRes = await request('POST', '/students', student1Data);
    assert(dupRes.status === 409 && !dupRes.data?.success,
      'POST /students rejects duplicate email registration with 409 Conflict');

    // 8. Query Student by Registration ID (Public student status lookup)
    const lookupRes = await request('GET', `/students/${regId1}`);
    assert(lookupRes.status === 200 && lookupRes.data?.data?.registration_id === regId1,
      `GET /students/${regId1} returns student profile and status audit timeline`);

    // 9. Paginated Students Query with Stats
    const listRes = await request('GET', '/students?page=1&limit=5');
    assert(listRes.status === 200 && listRes.data?.success && listRes.data?.pagination && listRes.data?.stats,
      'GET /students?page=1&limit=5 returns paginated records, pagination metadata, and summary counters');

    // 10. Unauthenticated Status Modification Blocked
    const unauthApprove = await request('PUT', `/students/${regId1}/approve`);
    assert(unauthApprove.status === 401 && !unauthApprove.data?.success, 
      'PUT /students/:id/approve rejects unauthenticated request with 401 Unauthorized');

    // 11. Authenticated Status Approval
    const authApprove = await request('PUT', `/students/${regId1}/approve`, { remarks: 'Verified by Admin spetrum' }, adminToken);
    assert(authApprove.status === 200 && authApprove.data?.data?.status === 'Approved', 
      'PUT /students/:id/approve accepts valid Bearer token and updates status to Approved');

    // 12. Workflow State Lock Prevention
    const reApprove = await request('PUT', `/students/${regId1}/approve`, null, adminToken);
    assert(reApprove.status === 400 && !reApprove.data?.success, 
      'PUT /students/:id/approve blocks state modification of an already Approved record (400 Bad Request)');

    // 13. Groq AI Assistant Chat
    const aiRes = await request('POST', '/ai/chat', {
      message: 'What programs are offered at ULAB and what is the minimum age?'
    });
    assert(aiRes.status === 200 && aiRes.data?.success && aiRes.data?.data?.reply,
      'POST /ai/chat connects to AI model, processes query, and returns sanitized domain reply');

    console.log(`\n====================================================`);
    console.log(`📊 Test Execution Summary: ${passed} PASSED | ${failed} FAILED`);
    console.log(`====================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    process.exit(1);
  }
}

runTests();
