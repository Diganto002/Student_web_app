const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken } = require('../middlewares/authMiddleware');

/**
 * @route   POST /admin/login
 * @desc    Authenticate admin user
 */
router.post('/login', adminController.adminLogin);

/**
 * @route   GET /admin/approved-students
 * @desc    Get all approved students with registration and academic status
 */
router.get('/approved-students', verifyAdminToken, adminController.getApprovedStudents);

/**
 * @route   GET /admin/courses
 * @desc    Get all courses in the catalog
 */
router.get('/courses', verifyAdminToken, adminController.getCoursesCatalog);

/**
 * @route   POST /admin/courses
 * @desc    Add a new course to catalog
 */
router.post('/courses', verifyAdminToken, adminController.createCourse);

/**
 * @route   GET /admin/offerings
 * @desc    Get offered courses for department, semester, and year
 */
router.get('/offerings', verifyAdminToken, adminController.getOfferedCourses);

/**
 * @route   POST /admin/offerings
 * @desc    Assign/open courses for a department, semester, and year
 */
router.post('/offerings', verifyAdminToken, adminController.offerCourses);

/**
 * @route   PATCH /admin/offerings/:id/toggle
 * @desc    Toggle offering status between Open and Closed
 */
router.patch('/offerings/:id/toggle', verifyAdminToken, adminController.toggleCourseOffering);

/**
 * @route   GET /admin/bills
 * @desc    Get all student bills with metrics, search, and filters
 */
router.get('/bills', verifyAdminToken, adminController.getAllBills);

/**
 * @route   GET /admin/bills/:id
 * @desc    Get specific student bill with detailed enrolled courses breakdown
 */
router.get('/bills/:id', verifyAdminToken, adminController.getBillById);

/**
 * @route   PATCH /admin/bills/:id/discount
 * @desc    Apply discount (e.g. 20, 40, 50, 100%) to a student's bill
 */
router.patch('/bills/:id/discount', verifyAdminToken, adminController.updateBillDiscount);

/**
 * @route   PATCH /admin/bills/:id/status
 * @desc    Update bill payment status ('Paid' or 'Unpaid')
 */
router.patch('/bills/:id/status', verifyAdminToken, adminController.updateBillPaymentStatus);

module.exports = router;
