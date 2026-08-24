const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

/**
 * @route   POST /admin/login
 * @desc    Authenticate admin user
 */
router.post('/login', adminController.adminLogin);

module.exports = router;
