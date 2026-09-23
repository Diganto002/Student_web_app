const { dbGet, dbAll, dbRun, generateRegistrationId, extractDepartment } = require('../database');
const { generateStudentToken } = require('../middlewares/authMiddleware');

/**
 * POST /students - Public Student Registration
 */
exports.createStudent = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, gender, address, course_name, semester, academic_year } = req.body;

    // Check duplicate email
    const existingEmail = await dbGet('SELECT id FROM students WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email address already exists.'
      });
    }

    // Check duplicate phone
    const existingPhone = await dbGet('SELECT id FROM students WHERE phone = ?', [phone]);
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'A student with this phone number already exists.'
      });
    }

    // Generate unique Registration ID
    const registration_id = await generateRegistrationId();
    const department = extractDepartment(course_name);
    const sem = semester || 'Spring';
    const year = academic_year || '2026';

    // Insert student with default status 'Submitted'
    const insertResult = await dbRun(`
      INSERT INTO students (
        registration_id, first_name, last_name, email, phone,
        date_of_birth, gender, address, course_name, department,
        semester, academic_year, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
    `, [
      registration_id, first_name, last_name, email, phone,
      date_of_birth, gender, address, course_name, department,
      sem, year
    ]);

    const studentId = insertResult.lastID;

    // Log to status_history
    await dbRun(`
      INSERT INTO status_history (student_id, old_status, new_status, remarks)
      VALUES (?, 'N/A', 'Submitted', 'Application submitted by student')
    `, [studentId]);

    // Fetch created student record
    const createdStudent = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);

    return res.status(201).json({
      success: true,
      message: 'Student registration submitted successfully! Application is currently under administrative review.',
      data: createdStudent
    });

  } catch (error) {
    console.error('Error creating student registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while processing registration.'
    });
  }
};

/**
 * GET /students - Paginated List with search and status filters (Admin)
 */
exports.getStudents = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    let countQuery = 'SELECT COUNT(*) as count FROM students WHERE 1=1';
    let dataQuery = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search) {
      const searchClause = ' AND (registration_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      countQuery += searchClause;
      dataQuery += searchClause;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status && status !== 'All') {
      const statusClause = ' AND status = ?';
      countQuery += statusClause;
      dataQuery += statusClause;
      params.push(status);
    }

    // Get total count
    const totalRow = await dbGet(countQuery, params);
    const total = totalRow ? totalRow.count : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Get paginated data
    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const students = await dbAll(dataQuery, [...params, limit, offset]);

    // Summary counters for admin header
    const totalCount = await dbGet('SELECT COUNT(*) as c FROM students');
    const submittedCount = await dbGet('SELECT COUNT(*) as c FROM students WHERE status = "Submitted"');
    const approvedCount = await dbGet('SELECT COUNT(*) as c FROM students WHERE status = "Approved"');
    const rejectedCount = await dbGet('SELECT COUNT(*) as c FROM students WHERE status = "Rejected"');

    const stats = {
      total: totalCount ? totalCount.c : 0,
      submitted: submittedCount ? submittedCount.c : 0,
      approved: approvedCount ? approvedCount.c : 0,
      rejected: rejectedCount ? rejectedCount.c : 0
    };

    return res.status(200).json({
      success: true,
      data: students,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student applications.'
    });
  }
};

/**
 * GET /students/:id - Get details of a single registration with status history
 */
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    let student;
    if (/^\d+$/.test(id)) {
      student = await dbGet('SELECT * FROM students WHERE id = ?', [id]);
    } else {
      student = await dbGet('SELECT * FROM students WHERE registration_id = ?', [id]);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student application not found.'
      });
    }

    // Fetch status history
    const history = await dbAll(`
      SELECT * FROM status_history 
      WHERE student_id = ? 
      ORDER BY updated_at DESC
    `, [student.id]);

    return res.status(200).json({
      success: true,
      data: {
        ...student,
        history
      }
    });

  } catch (error) {
    console.error('Error fetching student details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student application details.'
    });
  }
};

/**
 * PUT /students/:id/approve - Approve student registration & generate default student credentials
 */
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};

    const student = await dbGet('SELECT * FROM students WHERE id = ? OR registration_id = ?', [id, id]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student application not found.'
      });
    }

    // Rule: Only applications in 'Submitted' state can be updated
    if (student.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: `Action denied. Application is already '${student.status}' and cannot be changed back or modified.`
      });
    }

    const now = new Date().toISOString();
    // Default initial password is the student's unique Registration ID (REG10XX)
    const initialPassword = student.password || student.registration_id;

    await dbRun(`
      UPDATE students 
      SET status = 'Approved',
          password = ?,
          is_password_changed = 0,
          updated_at = ? 
      WHERE id = ?
    `, [initialPassword, now, student.id]);

    await dbRun(`
      INSERT INTO status_history (student_id, old_status, new_status, remarks, updated_at)
      VALUES (?, 'Submitted', 'Approved', ?, ?)
    `, [student.id, remarks || 'Application approved by administrator. Student account activated.', now]);

    const updatedStudent = await dbGet('SELECT * FROM students WHERE id = ?', [student.id]);

    return res.status(200).json({
      success: true,
      message: `Registration ${student.registration_id} approved successfully! Login ID: ${student.registration_id}`,
      data: updatedStudent,
      credentials: {
        username: student.registration_id,
        initialPassword: student.registration_id
      }
    });

  } catch (error) {
    console.error('Error approving student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve application due to a server error.'
    });
  }
};

/**
 * PUT /students/:id/reject - Reject student registration
 */
exports.rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body || {};

    const student = await dbGet('SELECT * FROM students WHERE id = ? OR registration_id = ?', [id, id]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student application not found.'
      });
    }

    // Rule: Only applications in 'Submitted' state can be updated
    if (student.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: `Action denied. Application is already '${student.status}' and cannot be changed back or modified.`
      });
    }

    const now = new Date().toISOString();

    await dbRun(`
      UPDATE students 
      SET status = 'Rejected', updated_at = ? 
      WHERE id = ?
    `, [now, student.id]);

    await dbRun(`
      INSERT INTO status_history (student_id, old_status, new_status, remarks, updated_at)
      VALUES (?, 'Submitted', 'Rejected', ?, ?)
    `, [student.id, remarks || 'Application rejected by administrator', now]);

    const updatedStudent = await dbGet('SELECT * FROM students WHERE id = ?', [student.id]);

    return res.status(200).json({
      success: true,
      message: `Registration ${student.registration_id} rejected.`,
      data: updatedStudent
    });

  } catch (error) {
    console.error('Error rejecting student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject application due to a server error.'
    });
  }
};

/**
 * POST /students/login - Student Authentication
 */
exports.studentLogin = async (req, res) => {
  try {
    const { registration_id, student_id, password } = req.body || {};
    const loginId = (registration_id || student_id || '').trim().toUpperCase();
    const pwd = (password || '').trim();

    if (!loginId || !pwd) {
      return res.status(400).json({
        success: false,
        message: 'Student ID / Registration ID and password are required.'
      });
    }

    const student = await dbGet(`
      SELECT * FROM students 
      WHERE UPPER(registration_id) = ? OR LOWER(email) = ?
    `, [loginId, loginId.toLowerCase()]);

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Student ID or password.'
      });
    }

    // Check application status
    if (student.status === 'Submitted') {
      return res.status(403).json({
        success: false,
        status: 'Submitted',
        message: 'Your admission application is currently under administrative review. Once approved, you will be able to log in to the student portal. Please check back later or contact the admissions office.'
      });
    }

    if (student.status === 'Rejected') {
      return res.status(403).json({
        success: false,
        status: 'Rejected',
        message: 'Your admission application was not approved. Please contact the admissions office for further assistance.'
      });
    }

    if (student.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: `Account status is '${student.status}'. Portal access is restricted.`
      });
    }

    // Verify password (matches saved password or initial default registration_id)
    const validPassword = student.password || student.registration_id;
    if (pwd !== validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Student ID or password.'
      });
    }

    const token = generateStudentToken(student);

    return res.status(200).json({
      success: true,
      message: 'Student authentication successful!',
      token,
      must_change_password: student.is_password_changed === 0,
      student: {
        id: student.id,
        registration_id: student.registration_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        phone: student.phone,
        department: student.department || extractDepartment(student.course_name),
        semester: student.semester || 'Spring',
        academic_year: student.academic_year || '2026',
        course_name: student.course_name,
        is_password_changed: student.is_password_changed
      }
    });

  } catch (error) {
    console.error('Error during student login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during student authentication.'
    });
  }
};

/**
 * POST /students/change-password - Change initial or existing password (Student Protected)
 */
exports.changeStudentPassword = async (req, res) => {
  try {
    const student = req.student;
    const { old_password, new_password } = req.body || {};

    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 6 characters.'
      });
    }

    // If password was already changed, require old password verification
    if (student.is_password_changed === 1 && old_password) {
      const current = await dbGet('SELECT password FROM students WHERE id = ?', [student.id]);
      if (current && current.password !== old_password.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.'
        });
      }
    }

    const now = new Date().toISOString();
    await dbRun(`
      UPDATE students 
      SET password = ?, is_password_changed = 1, updated_at = ? 
      WHERE id = ?
    `, [new_password.trim(), now, student.id]);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully! You can now access your student portal.'
    });

  } catch (error) {
    console.error('Error changing student password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.'
    });
  }
};

/**
 * GET /students/me - Get current logged-in student profile & enrollment status
 */
exports.getStudentProfile = async (req, res) => {
  try {
    const student = req.student;
    const department = student.department || extractDepartment(student.course_name);

    // Check existing registration
    const registration = await dbGet(`
      SELECT * FROM course_registrations 
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `, [student.id, student.semester, student.academic_year]);

    let enrolledCourses = [];
    if (registration) {
      enrolledCourses = await dbAll(`
        SELECT c.* 
        FROM course_registration_items cri
        JOIN courses c ON cri.course_id = c.id
        WHERE cri.registration_id = ?
      `, [registration.id]);
    }

    // Check existing bill
    let bill = await dbGet(`
      SELECT * FROM semester_bills
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `, [student.id, student.semester, student.academic_year]);

    return res.status(200).json({
      success: true,
      student: {
        ...student,
        department
      },
      registration: registration ? {
        ...registration,
        courses: enrolledCourses
      } : null,
      bill: bill || null
    });

  } catch (error) {
    console.error('Error retrieving student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile.'
    });
  }
};

/**
 * GET /students/me/available-courses - Get offered courses for student's department & semester
 */
exports.getAvailableCourses = async (req, res) => {
  try {
    const student = req.student;
    const department = student.department || extractDepartment(student.course_name);
    const semester = student.semester || 'Spring';
    const academic_year = student.academic_year || '2026';

    const courses = await dbAll(`
      SELECT c.id, c.course_code, c.course_title, c.credit_hours, c.department, c.description,
             oc.id as offering_id, oc.semester, oc.academic_year, oc.is_open
      FROM offered_courses oc
      JOIN courses c ON oc.course_id = c.id
      WHERE oc.department = ? AND oc.semester = ? AND oc.academic_year = ? AND oc.is_open = 1
      ORDER BY c.course_code ASC
    `, [department, semester, academic_year]);

    // Check if already registered
    const existingRegistration = await dbGet(`
      SELECT id, total_credits, status, registered_at
      FROM course_registrations
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `, [student.id, semester, academic_year]);

    let registeredCourseIds = [];
    if (existingRegistration) {
      const items = await dbAll(`
        SELECT course_id FROM course_registration_items WHERE registration_id = ?
      `, [existingRegistration.id]);
      registeredCourseIds = items.map(i => i.course_id);
    }

    return res.status(200).json({
      success: true,
      department,
      semester,
      academic_year,
      max_credits: 15.0,
      is_registered: !!existingRegistration,
      registration: existingRegistration || null,
      registered_course_ids: registeredCourseIds,
      courses
    });

  } catch (error) {
    console.error('Error fetching available courses for student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available courses.'
    });
  }
};

/**
 * POST /students/me/register-courses - Submit semester course registration (Student Protected)
 */
exports.registerCourses = async (req, res) => {
  try {
    const student = req.student;
    const { course_ids } = req.body || {};

    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one course for registration.'
      });
    }

    const department = student.department || extractDepartment(student.course_name);
    const semester = student.semester || 'Spring';
    const academic_year = student.academic_year || '2026';

    // Check if already registered
    const existing = await dbGet(`
      SELECT id FROM course_registrations 
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `, [student.id, semester, academic_year]);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Course registration for ${semester} ${academic_year} has already been completed.`
      });
    }

    // Validate courses are currently offered for this department & semester
    const placeholders = course_ids.map(() => '?').join(',');
    const offeredList = await dbAll(`
      SELECT c.id, c.course_code, c.course_title, c.credit_hours
      FROM offered_courses oc
      JOIN courses c ON oc.course_id = c.id
      WHERE oc.department = ? AND oc.semester = ? AND oc.academic_year = ? AND oc.is_open = 1
        AND c.id IN (${placeholders})
    `, [department, semester, academic_year, ...course_ids]);

    if (offeredList.length !== course_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected courses are not available for enrollment in your department and semester.'
      });
    }

    // Check credit limit (max 15.0 credits)
    const totalCredits = offeredList.reduce((sum, c) => sum + (c.credit_hours || 0), 0);
    if (totalCredits > 15.0) {
      return res.status(400).json({
        success: false,
        message: `Total credits exceed maximum allowable limit of 15.0 credits. (Selected: ${totalCredits} credits).`
      });
    }

    // Create course_registrations record
    const regResult = await dbRun(`
      INSERT INTO course_registrations (student_id, semester, academic_year, total_credits, status)
      VALUES (?, ?, ?, ?, 'Completed')
    `, [student.id, semester, academic_year, totalCredits]);

    const registrationId = regResult.lastID;

    // Insert items
    for (const c of offeredList) {
      await dbRun(`
        INSERT INTO course_registration_items (registration_id, course_id)
        VALUES (?, ?)
      `, [registrationId, c.id]);
    }

    // Automatically compute and generate semester bill at 5,000 BDT per credit
    const ratePerCredit = 5000.0;
    const grossAmount = totalCredits * ratePerCredit;

    // Check if an existing bill record or discount was pre-set
    const existingBill = await dbGet(`
      SELECT * FROM semester_bills
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `, [student.id, semester, academic_year]);

    let billRecord;
    if (existingBill) {
      const discountPercentage = existingBill.discount_percentage || 0;
      const discountAmount = (grossAmount * discountPercentage) / 100.0;
      const netAmount = grossAmount - discountAmount;

      await dbRun(`
        UPDATE semester_bills
        SET registration_id = ?, total_credits = ?, rate_per_credit = ?, gross_amount = ?,
            discount_percentage = ?, discount_amount = ?, net_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [registrationId, totalCredits, ratePerCredit, grossAmount, discountPercentage, discountAmount, netAmount, existingBill.id]);

      billRecord = await dbGet('SELECT * FROM semester_bills WHERE id = ?', [existingBill.id]);
    } else {
      const billRes = await dbRun(`
        INSERT INTO semester_bills
        (student_id, registration_id, semester, academic_year, total_credits, rate_per_credit, gross_amount, discount_percentage, discount_amount, net_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'Unpaid')
      `, [student.id, registrationId, semester, academic_year, totalCredits, ratePerCredit, grossAmount, grossAmount]);

      billRecord = await dbGet('SELECT * FROM semester_bills WHERE id = ?', [billRes.lastID]);
    }

    return res.status(201).json({
      success: true,
      message: 'Course registration completed successfully!',
      registration: {
        id: registrationId,
        student_id: student.id,
        registration_id: student.registration_id,
        student_name: `${student.first_name} ${student.last_name}`,
        department,
        semester,
        academic_year,
        total_credits: totalCredits,
        status: 'Completed',
        registered_at: new Date().toISOString(),
        courses: offeredList
      },
      bill: billRecord
    });

  } catch (error) {
    console.error('Error submitting course registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process course registration.'
    });
  }
};

/**
 * GET /students/me/registrations - Get all course registrations / slips for current student
 */
exports.getMyRegistrations = async (req, res) => {
  try {
    const student = req.student;

    const registrations = await dbAll(`
      SELECT * FROM course_registrations
      WHERE student_id = ?
      ORDER BY registered_at DESC
    `, [student.id]);

    const detailedRegistrations = [];
    for (const reg of registrations) {
      const items = await dbAll(`
        SELECT c.id, c.course_code, c.course_title, c.credit_hours, c.department, c.description
        FROM course_registration_items cri
        JOIN courses c ON cri.course_id = c.id
        WHERE cri.registration_id = ?
      `, [reg.id]);

      detailedRegistrations.push({
        ...reg,
        courses: items
      });
    }

    return res.status(200).json({
      success: true,
      registrations: detailedRegistrations
    });

  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve course registration history.'
    });
  }
};

/**
 * GET /students/me/bills - Get semester bills and breakdown for logged-in student
 */
exports.getMyBills = async (req, res) => {
  try {
    const student = req.student;

    const bills = await dbAll(`
      SELECT sb.*, cr.registered_at
      FROM semester_bills sb
      LEFT JOIN course_registrations cr ON sb.registration_id = cr.id
      WHERE sb.student_id = ?
      ORDER BY sb.id DESC
    `, [student.id]);

    const detailedBills = [];
    for (const bill of bills) {
      let enrolledCourses = [];
      if (bill.registration_id) {
        enrolledCourses = await dbAll(`
          SELECT c.id, c.course_code, c.course_title, c.credit_hours, c.department,
                 (c.credit_hours * ?) as course_tuition
          FROM course_registration_items cri
          JOIN courses c ON cri.course_id = c.id
          WHERE cri.registration_id = ?
        `, [bill.rate_per_credit || 5000.0, bill.registration_id]);
      }

      detailedBills.push({
        ...bill,
        rate_per_credit: bill.rate_per_credit || 5000.0,
        courses: enrolledCourses
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        id: student.id,
        registration_id: student.registration_id,
        first_name: student.first_name,
        last_name: student.last_name,
        department: student.department || extractDepartment(student.course_name),
        semester: student.semester,
        academic_year: student.academic_year
      },
      bills: detailedBills
    });

  } catch (error) {
    console.error('Error fetching student bills:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing history.'
    });
  }
};

