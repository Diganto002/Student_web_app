const { dbGet } = require('../database');

const ADMIN_TOKEN = 'admin-token-spectrum-authenticated-2026';

/**
 * Verify Admin Authentication Token
 */
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-admin-token'];

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Admin authentication token required to perform this action.'
    });
  }

  next();
}

/**
 * Generate a student session Bearer token
 */
function generateStudentToken(student) {
  const payload = {
    id: student.id,
    regId: student.registration_id,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Verify Student Authentication Token
 */
async function verifyStudentToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-student-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Student authentication token required.'
      });
    }

    let payload;
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      payload = JSON.parse(decoded);
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student authentication token.'
      });
    }

    if (!payload || !payload.id || !payload.regId) {
      return res.status(401).json({
        success: false,
        message: 'Malformed student authentication token.'
      });
    }

    if (payload.exp && Date.now() > payload.exp) {
      return res.status(401).json({
        success: false,
        message: 'Student session expired. Please log in again.'
      });
    }

    const student = await dbGet(`
      SELECT id, registration_id, first_name, last_name, email, phone, gender,
             address, course_name, department, semester, academic_year,
             status, is_password_changed, created_at, updated_at
      FROM students
      WHERE id = ? AND registration_id = ?
    `, [payload.id, payload.regId]);

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Student record not found or session invalid.'
      });
    }

    if (student.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Your admission application is under review or not active. Access denied.'
      });
    }

    req.student = student;
    next();
  } catch (error) {
    console.error('Error in verifyStudentToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication check failed.'
    });
  }
}

module.exports = {
  ADMIN_TOKEN,
  verifyAdminToken,
  generateStudentToken,
  verifyStudentToken
};
