require('dotenv').config();
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

    // 13. DeepSeek-v4-flash AI Chat (AgentRouter)
    const deepseekRes = await request('POST', '/ai/chat', {
      message: 'What programs are offered at ULAB and what is the minimum age?',
      provider: 'deepseek'
    });
    assert(deepseekRes.status === 200 && deepseekRes.data?.success && deepseekRes.data?.data?.reply,
      'POST /ai/chat connects to DeepSeek-v4-flash (AgentRouter), processes query, and returns sanitized domain reply');

    // 14. Groq AI Assistant Chat
    const groqRes = await request('POST', '/ai/chat', {
      message: 'What programs are offered at ULAB?',
      provider: 'groq'
    });
    assert(groqRes.status === 200 && groqRes.data?.success && groqRes.data?.data?.reply,
      'POST /ai/chat connects to Groq model, processes query, and returns sanitized domain reply');

    // 15. Student Login Rejection for Pending/Submitted Application
    const num2 = Math.floor(10000000 + Math.random() * 90000000);
    const pendingStudentData = {
      first_name: 'Tanvir',
      last_name: 'Ahmed',
      email: `tanvir_${num2}@gmail.com`,
      phone: `018${num2.toString().substring(0, 8)}`,
      date_of_birth: '2003-08-20',
      gender: 'Male',
      address: 'Dhanmondi 27, Dhaka',
      course_name: 'Computer Science & Engineering (CSE)'
    };
    const regPendingRes = await request('POST', '/students', pendingStudentData);
    const pendingRegId = regPendingRes.data?.data?.registration_id;
    const pendingLogin = await request('POST', '/students/login', { registration_id: pendingRegId, password: pendingRegId });
    assert(pendingLogin.status === 403 && !pendingLogin.data?.success && pendingLogin.data?.status === 'Submitted',
      'POST /students/login rejects unapproved/pending applicant with 403 Forbidden and administrative review notice');

    // 16. Student Login Success with Approved ID (regId1 was approved in Test 11)
    const approvedLogin = await request('POST', '/students/login', { registration_id: regId1, password: regId1 });
    const studentToken = approvedLogin.data?.token;
    assert(approvedLogin.status === 200 && approvedLogin.data?.success && studentToken,
      `POST /students/login authenticates approved student ${regId1} with default credentials`);

    // 17. Student Profile Fetch
    const profileRes = await request('GET', '/students/me/profile', null, studentToken);
    assert(profileRes.status === 200 && profileRes.data?.student?.registration_id === regId1,
      'GET /students/me/profile returns authenticated student profile');

    // 18. Student First-Time Password Change
    const changePassRes = await request('POST', '/students/change-password', { new_password: 'StudentSecurePass123' }, studentToken);
    assert(changePassRes.status === 200 && changePassRes.data?.success,
      'POST /students/change-password allows student to update default password');

    // 19. Admin List Approved Students
    const approvedList = await request('GET', '/admin/approved-students', null, adminToken);
    assert(approvedList.status === 200 && approvedList.data?.success && Array.isArray(approvedList.data?.data),
      'GET /admin/approved-students returns list of active approved students');

    // 20. Admin Course Catalog
    const catalogRes = await request('GET', '/admin/courses?department=CSE', null, adminToken);
    assert(catalogRes.status === 200 && catalogRes.data?.success && catalogRes.data?.data?.length > 0,
      'GET /admin/courses returns pre-seeded course catalog');

    // 21. Admin Add New Course to Catalog
    const newCourseCode = `TEST${Math.floor(100 + Math.random() * 900)}`;
    const addCourseRes = await request('POST', '/admin/courses', {
      course_code: newCourseCode,
      course_title: 'Cloud & Distributed Computing',
      credit_hours: 3.0,
      department: 'CSE',
      description: 'Microservices, Docker, Kubernetes, and Cloud Architecture.'
    }, adminToken);
    assert(addCourseRes.status === 201 && addCourseRes.data?.success,
      `POST /admin/courses adds new course ${newCourseCode} to catalog`);

    // 22. Admin Query Offered Courses
    const offeringsRes = await request('GET', '/admin/offerings?department=CSE&semester=Spring&academic_year=2026', null, adminToken);
    assert(offeringsRes.status === 200 && offeringsRes.data?.offerings?.length > 0,
      'GET /admin/offerings returns semester offered courses');

    // 23. Student Available Courses for Registration
    const availCoursesRes = await request('GET', '/students/me/available-courses', null, studentToken);
    const availableCourses = availCoursesRes.data?.courses || [];
    assert(availCoursesRes.status === 200 && availableCourses.length > 0,
      'GET /students/me/available-courses returns eligible courses for student department and semester');

    // 24. Student Course Registration Submission
    const selectedCourseIds = availableCourses.slice(0, 3).map(c => c.id);
    const regSubmitRes = await request('POST', '/students/me/register-courses', { course_ids: selectedCourseIds }, studentToken);
    assert(regSubmitRes.status === 201 && regSubmitRes.data?.success && regSubmitRes.data?.registration?.status === 'Completed',
      'POST /students/me/register-courses completes course registration and generates summary');

    // 25. Prevent Duplicate Course Registration in Same Semester
    const dupRegSubmit = await request('POST', '/students/me/register-courses', { course_ids: selectedCourseIds }, studentToken);
    assert(dupRegSubmit.status === 400 && !dupRegSubmit.data?.success,
      'POST /students/me/register-courses prevents duplicate enrollment in same semester (400 Bad Request)');

    // 26. Fetch Completed Advising Slips
    const slipsRes = await request('GET', '/students/me/registrations', null, studentToken);
    assert(slipsRes.status === 200 && slipsRes.data?.registrations?.length > 0,
      'GET /students/me/registrations returns completed registration slip with enrolled courses');

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
