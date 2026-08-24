const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { validateStudentRegistration } = require('../middlewares/validationMiddleware');
const { verifyAdminToken } = require('../middlewares/authMiddleware');

/**
 * @route   POST /students
 * @desc    Create new student registration (Public)
 */
router.post('/', validateStudentRegistration, studentController.createStudent);

/**
 * @route   GET /students
 * @desc    Get all registrations with search, filter & pagination
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
