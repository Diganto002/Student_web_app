const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { validateStudentRegistration } = require('../middlewares/validationMiddleware');
const { verifyAdminToken, verifyStudentToken } = require('../middlewares/authMiddleware');

/**
 * @route   POST /students
 * @desc    Create new student registration (Public admission)
 */
router.post('/', validateStudentRegistration, studentController.createStudent);

/**
 * @route   POST /students/login
 * @desc    Authenticate student using Student ID and password
 */
router.post('/login', studentController.studentLogin);

/**
 * @route   POST /students/change-password
 * @desc    Update student password (First login or self-service)
 */
router.post('/change-password', verifyStudentToken, studentController.changeStudentPassword);

/**
 * @route   GET /students/me/profile
 * @desc    Get currently logged in student profile and enrollment status
 */
router.get('/me/profile', verifyStudentToken, studentController.getStudentProfile);

/**
 * @route   GET /students/me/available-courses
 * @desc    Get available offered courses for current student's department and semester
 */
router.get('/me/available-courses', verifyStudentToken, studentController.getAvailableCourses);

/**
 * @route   POST /students/me/register-courses
 * @desc    Submit course registration for current semester
 */
router.post('/me/register-courses', verifyStudentToken, studentController.registerCourses);

/**
 * @route   GET /students/me/registrations
 * @desc    Get student's registration history and advising slips
 */
router.get('/me/registrations', verifyStudentToken, studentController.getMyRegistrations);

/**
 * @route   GET /students/me/bills
 * @desc    Get student's semester bills, fees breakdown, and payment status
 */
router.get('/me/bills', verifyStudentToken, studentController.getMyBills);

/**
 * @route   GET /students
 * @desc    Get all registrations with search, filter & pagination (Admin)
 */
router.get('/', studentController.getStudents);

/**
 * @route   GET /students/:id
 * @desc    Get single student details with status history
 */
router.get('/:id', studentController.getStudentById);

/**
 * @route   PUT /students/:id/approve
 * @desc    Approve a student registration (Admin Protected)
 */
router.put('/:id/approve', verifyAdminToken, studentController.approveStudent);

/**
 * @route   PUT /students/:id/reject
 * @desc    Reject a student registration (Admin Protected)
 */
router.put('/:id/reject', verifyAdminToken, studentController.rejectStudent);

module.exports = router;
