const { dbGet, dbAll, dbRun, generateRegistrationId } = require('../database');


exports.createStudent = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, gender, address, course_name } = req.body;

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

    // Insert student
    const insertResult = await dbRun(`
      INSERT INTO students (registration_id, first_name, last_name, email, phone, date_of_birth, gender, address, course_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
    `, [registration_id, first_name, last_name, email, phone, date_of_birth, gender, address, course_name]);

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
      message: 'Student registration submitted successfully!',
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
 * GET /students/id - Get details of a single registration with status history
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
 * PUT /students/:id/approve - Approve student registration
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

    await dbRun(`
      UPDATE students 
      SET status = 'Approved', updated_at = ? 
      WHERE id = ?
    `, [now, student.id]);

    await dbRun(`
      INSERT INTO status_history (student_id, old_status, new_status, remarks, updated_at)
      VALUES (?, 'Submitted', 'Approved', ?, ?)
    `, [student.id, remarks || 'Application approved by administrator', now]);

    const updatedStudent = await dbGet('SELECT * FROM students WHERE id = ?', [student.id]);

    return res.status(200).json({
      success: true,
      message: `Registration ${student.registration_id} approved successfully!`,
      data: updatedStudent
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
