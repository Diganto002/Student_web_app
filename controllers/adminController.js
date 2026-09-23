const { ADMIN_TOKEN } = require('../middlewares/authMiddleware');
const { dbGet, dbAll, dbRun } = require('../database');

/**
 * POST /admin/login - Authenticate Admin
 */
exports.adminLogin = (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const u = username.trim().toLowerCase();
    const p = password.trim();

    // Accepts admin / spetrum / spectrum with password admin123
    if ((u === 'spetrum' || u === 'spectrum' || u === 'admin') && p === 'admin123') {
      return res.status(200).json({
        success: true,
        message: 'Admin authentication successful!',
        token: ADMIN_TOKEN,
        admin: {
          username: username.trim(),
          role: 'Administrator'
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid admin username or password.'
    });

  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login authentication.'
    });
  }
};

/**
 * GET /admin/approved-students - List approved students with registration & academic status
 */
exports.getApprovedStudents = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const department = req.query.department ? req.query.department.trim() : '';

    let sql = `
      SELECT s.id, s.registration_id, s.first_name, s.last_name, s.email, s.phone,
             s.gender, s.course_name, s.department, s.semester, s.academic_year,
             s.status, s.is_password_changed, s.created_at,
             cr.id as registration_id_pk, cr.total_credits, cr.status as registration_status, cr.registered_at
      FROM students s
      LEFT JOIN course_registrations cr ON s.id = cr.student_id AND s.semester = cr.semester AND s.academic_year = cr.academic_year
      WHERE s.status = 'Approved'
    `;
    const params = [];

    if (search) {
      sql += ' AND (s.registration_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p, p);
    }

    if (department && department !== 'All') {
      sql += ' AND s.department = ?';
      params.push(department);
    }

    sql += ' ORDER BY s.id DESC';

    const students = await dbAll(sql, params);

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error retrieving approved students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve approved students.'
    });
  }
};

/**
 * GET /admin/courses - Get course catalog (with optional department filter)
 */
exports.getCoursesCatalog = async (req, res) => {
  try {
    const department = req.query.department ? req.query.department.trim() : '';

    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (department && department !== 'All') {
      sql += ' AND department = ?';
      params.push(department);
    }

    sql += ' ORDER BY department ASC, course_code ASC';

    const courses = await dbAll(sql, params);

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });

  } catch (error) {
    console.error('Error fetching course catalog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses catalog.'
    });
  }
};

/**
 * POST /admin/courses - Add a new course to catalog
 */
exports.createCourse = async (req, res) => {
  try {
    const { course_code, course_title, credit_hours, department, description } = req.body || {};

    if (!course_code || !course_title || !department) {
      return res.status(400).json({
        success: false,
        message: 'Course code, title, and department are required.'
      });
    }

    const code = course_code.trim().toUpperCase();
    const existing = await dbGet('SELECT id FROM courses WHERE course_code = ?', [code]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Course with code '${code}' already exists.`
      });
    }

    const credits = parseFloat(credit_hours) || 3.0;

    const result = await dbRun(`
      INSERT INTO courses (course_code, course_title, credit_hours, department, description)
      VALUES (?, ?, ?, ?, ?)
    `, [code, course_title.trim(), credits, department.trim().toUpperCase(), description ? description.trim() : '']);

    const createdCourse = await dbGet('SELECT * FROM courses WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      message: `Course ${code} added to catalog successfully!`,
      data: createdCourse
    });

  } catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course.'
    });
  }
};

/**
 * GET /admin/offerings - Get offered courses for specific Department, Semester, and Academic Year
 */
exports.getOfferedCourses = async (req, res) => {
  try {
    const department = req.query.department ? req.query.department.trim() : 'CSE';
    const semester = req.query.semester ? req.query.semester.trim() : 'Spring';
    const academic_year = req.query.academic_year ? req.query.academic_year.trim() : '2026';

    const offerings = await dbAll(`
      SELECT oc.id as offering_id, oc.is_open, oc.semester, oc.academic_year, oc.department,
             c.id as course_id, c.course_code, c.course_title, c.credit_hours, c.description
      FROM offered_courses oc
      JOIN courses c ON oc.course_id = c.id
      WHERE oc.department = ? AND oc.semester = ? AND oc.academic_year = ?
      ORDER BY c.course_code ASC
    `, [department, semester, academic_year]);

    // Also get all catalog courses for this department so admin can see what is NOT yet offered
    const allDeptCourses = await dbAll(`
      SELECT * FROM courses WHERE department = ? ORDER BY course_code ASC
    `, [department]);

    const offeredCourseIds = new Set(offerings.map(o => o.course_id));
    const availableToOffer = allDeptCourses.filter(c => !offeredCourseIds.has(c.id));

    return res.status(200).json({
      success: true,
      department,
      semester,
      academic_year,
      offerings,
      available_to_offer: availableToOffer
    });

  } catch (error) {
    console.error('Error fetching course offerings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve course offerings.'
    });
  }
};

/**
 * POST /admin/offerings - Assign/open courses for Department, Semester & Academic Year
 */
exports.offerCourses = async (req, res) => {
  try {
    const { department, semester, academic_year, course_ids } = req.body || {};

    if (!department || !semester || !academic_year || !Array.isArray(course_ids) || course_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Department, Semester, Academic Year, and a non-empty array of course_ids are required.'
      });
    }

    const dept = department.trim().toUpperCase();
    const sem = semester.trim();
    const year = academic_year.trim();

    let assignedCount = 0;
    for (const cid of course_ids) {
      const resInsert = await dbRun(`
        INSERT OR IGNORE INTO offered_courses (course_id, department, semester, academic_year, is_open)
        VALUES (?, ?, ?, ?, 1)
      `, [cid, dept, sem, year]);

      if (resInsert.changes > 0) {
        assignedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully offered ${assignedCount} course(s) for ${dept} (${sem} ${year}).`
    });

  } catch (error) {
    console.error('Error assigning course offerings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign course offerings.'
    });
  }
};

/**
 * PATCH /admin/offerings/:id/toggle - Toggle course offering open/closed status
 */
exports.toggleCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;

    const offering = await dbGet('SELECT * FROM offered_courses WHERE id = ?', [id]);
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: 'Course offering not found.'
      });
    }

    const newStatus = offering.is_open === 1 ? 0 : 1;
    await dbRun('UPDATE offered_courses SET is_open = ? WHERE id = ?', [newStatus, id]);

    return res.status(200).json({
      success: true,
      message: `Course offering is now ${newStatus === 1 ? 'Open' : 'Closed'}.`,
      is_open: newStatus
    });

  } catch (error) {
    console.error('Error toggling course offering:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update offering status.'
    });
  }
};

/**
 * GET /admin/bills - List student semester bills with financial metrics
 */
exports.getAllBills = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const department = req.query.department ? req.query.department.trim() : '';
    const semester = req.query.semester ? req.query.semester.trim() : '';
    const academic_year = req.query.academic_year ? req.query.academic_year.trim() : '';
    const payment_status = req.query.payment_status ? req.query.payment_status.trim() : '';

    let sql = `
      SELECT sb.*,
             s.registration_id, s.first_name, s.last_name, s.email, s.phone,
             s.department as student_department, s.course_name
      FROM semester_bills sb
      JOIN students s ON sb.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (s.registration_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p, p);
    }

    if (department && department !== 'All') {
      sql += ' AND s.department = ?';
      params.push(department);
    }

    if (semester && semester !== 'All') {
      sql += ' AND sb.semester = ?';
      params.push(semester);
    }

    if (academic_year && academic_year !== 'All') {
      sql += ' AND sb.academic_year = ?';
      params.push(academic_year);
    }

    if (payment_status && payment_status !== 'All') {
      sql += ' AND sb.payment_status = ?';
      params.push(payment_status);
    }

    sql += ' ORDER BY sb.id DESC';

    const bills = await dbAll(sql, params);

    // Compute overall statistics across all bills
    const allBills = await dbAll(`
      SELECT gross_amount, discount_amount, net_amount, payment_status 
      FROM semester_bills
    `);

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let totalDiscounts = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (const b of allBills) {
      totalBilled += (b.gross_amount || 0);
      totalDiscounts += (b.discount_amount || 0);
      if (b.payment_status === 'Paid') {
        totalCollected += (b.net_amount || 0);
        paidCount++;
      } else {
        totalDue += (b.net_amount || 0);
        unpaidCount++;
      }
    }

    return res.status(200).json({
      success: true,
      count: bills.length,
      stats: {
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_due: totalDue,
        total_discounts: totalDiscounts,
        paid_count: paidCount,
        unpaid_count: unpaidCount
      },
      data: bills
    });

  } catch (error) {
    console.error('Error retrieving semester bills:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bills.'
    });
  }
};

/**
 * GET /admin/bills/:id - Get single bill with enrolled courses
 */
exports.getBillById = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await dbGet(`
      SELECT sb.*,
             sb.registration_id AS course_registration_pk,
             s.registration_id, s.first_name, s.last_name, s.email, s.phone,
             s.department, s.course_name
      FROM semester_bills sb
      JOIN students s ON sb.student_id = s.id
      WHERE sb.id = ?
    `, [id]);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill record not found.'
      });
    }

    let courses = await dbAll(`
      SELECT c.id, c.course_code, c.course_title, c.credit_hours, c.department,
             (c.credit_hours * ?) as course_tuition
      FROM course_registration_items cri
      JOIN courses c ON cri.course_id = c.id
      JOIN course_registrations cr ON cri.registration_id = cr.id
      WHERE cr.student_id = ? AND cr.semester = ? AND cr.academic_year = ?
    `, [bill.rate_per_credit || 5000.0, bill.student_id, bill.semester, bill.academic_year]);

    if (courses.length === 0 && bill.course_registration_pk) {
      courses = await dbAll(`
        SELECT c.id, c.course_code, c.course_title, c.credit_hours, c.department,
               (c.credit_hours * ?) as course_tuition
        FROM course_registration_items cri
        JOIN courses c ON cri.course_id = c.id
        WHERE cri.registration_id = ?
      `, [bill.rate_per_credit || 5000.0, bill.course_registration_pk]);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...bill,
        courses
      }
    });

  } catch (error) {
    console.error('Error retrieving bill by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bill details.'
    });
  }
};

/**
 * PATCH /admin/bills/:id/discount - Update discount percentage (0%, 20%, 40%, 50%, 100%)
 */
exports.updateBillDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount_percentage, remarks } = req.body || {};

    const bill = await dbGet('SELECT * FROM semester_bills WHERE id = ?', [id]);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill record not found.'
      });
    }

    let pct = parseFloat(discount_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount percentage must be a valid number between 0 and 100.'
      });
    }

    const discountAmount = (bill.gross_amount * pct) / 100.0;
    const netAmount = bill.gross_amount - discountAmount;
    const now = new Date().toISOString();

    await dbRun(`
      UPDATE semester_bills
      SET discount_percentage = ?, discount_amount = ?, net_amount = ?,
          remarks = COALESCE(?, remarks), updated_at = ?
      WHERE id = ?
    `, [pct, discountAmount, netAmount, remarks || null, now, id]);

    const updated = await dbGet(`
      SELECT sb.*, s.registration_id, s.first_name, s.last_name, s.department
      FROM semester_bills sb
      JOIN students s ON sb.student_id = s.id
      WHERE sb.id = ?
    `, [id]);

    return res.status(200).json({
      success: true,
      message: `Discount of ${pct}% applied successfully. New net payable: ৳${netAmount.toLocaleString()}`,
      data: updated
    });

  } catch (error) {
    console.error('Error updating bill discount:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update discount.'
    });
  }
};

/**
 * PATCH /admin/bills/:id/status - Update payment status ('Paid' or 'Unpaid')
 */
exports.updateBillPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body || {};

    if (!payment_status || (payment_status !== 'Paid' && payment_status !== 'Unpaid')) {
      return res.status(400).json({
        success: false,
        message: "payment_status must be either 'Paid' or 'Unpaid'."
      });
    }

    const bill = await dbGet('SELECT * FROM semester_bills WHERE id = ?', [id]);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill record not found.'
      });
    }

    const now = new Date().toISOString();
    const paidAt = payment_status === 'Paid' ? now : null;

    await dbRun(`
      UPDATE semester_bills
      SET payment_status = ?, paid_at = ?, updated_at = ?
      WHERE id = ?
    `, [payment_status, paidAt, now, id]);

    const updated = await dbGet(`
      SELECT sb.*, s.registration_id, s.first_name, s.last_name, s.department
      FROM semester_bills sb
      JOIN students s ON sb.student_id = s.id
      WHERE sb.id = ?
    `, [id]);

    return res.status(200).json({
      success: true,
      message: `Bill payment status updated to '${payment_status}'.`,
      data: updated
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status.'
    });
  }
};

