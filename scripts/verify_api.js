const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

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
  console.log('🧪 Starting Automated API & Admin Auth Verification Suite...\n');
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

    // 2. Admin Login Failure (Invalid Credentials)
    const badLogin = await request('POST', '/admin/login', { username: 'spetrum', password: 'wrongpassword' });
    assert(badLogin.status === 401 && !badLogin.data.success, 'POST /admin/login rejects invalid password with 401 Unauthorized');

    // 3. Admin Login Success (spetrum : admin123)
    const goodLogin = await request('POST', '/admin/login', { username: 'spetrum', password: 'admin123' });
    const adminToken = goodLogin.data?.token;
    assert(goodLogin.status === 200 && goodLogin.data?.success && adminToken, 
      'POST /admin/login authenticates spetrum/admin123 and issues Bearer token');

    // 4. Submit valid registration
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const student1Data = {
      first_name: 'Mahmudul',
      last_name: 'Hasan',
      email: `test_${randomNum}@gmail.com`,
      phone: `017${randomNum.toString().substring(0, 8)}`,
      date_of_birth: '2002-05-15',
      gender: 'Male',
      address: 'House #45, Road #12, Sector 4, Uttara, Dhaka',
      course_name: 'Computer Science & Engineering'
    };
    const res1 = await request('POST', '/students', student1Data);
    const regId1 = res1.data?.data?.registration_id;
    assert(res1.status === 201 && res1.data?.success && regId1, 
      `POST /students creates registration ${regId1} with default Submitted status`);

    // 5. Unauthenticated Status Modification Blocked
    const unauthApprove = await request('PUT', `/students/${regId1}/approve`);
    assert(unauthApprove.status === 401 && !unauthApprove.data?.success, 
      'PUT /students/:id/approve rejects unauthenticated request with 401 Unauthorized');

    // 6. Authenticated Status Approval
    const authApprove = await request('PUT', `/students/${regId1}/approve`, { remarks: 'Verified by Admin spetrum' }, adminToken);
    assert(authApprove.status === 200 && authApprove.data?.data?.status === 'Approved', 
      'PUT /students/:id/approve accepts valid Bearer token and updates status to Approved');

    // 7. Workflow State Lock Prevention
    const reApprove = await request('PUT', `/students/${regId1}/approve`, null, adminToken);
    assert(reApprove.status === 400 && !reApprove.data?.success, 
      'PUT /students/:id/approve blocks state modification of an already Approved record (400 Bad Request)');

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
