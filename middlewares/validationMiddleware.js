const { body, validationResult } = require('express-validator');

const validateStudentRegistration = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[A-Za-z\s]+$/).withMessage('First name must contain alphabets and spaces only'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name must contain alphabets and spaces only'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{11}$/).withMessage('Phone number must be exact 11 digits (e.g., 01712345678)'),

  body('date_of_birth')
    .trim()
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      if (isNaN(dob.getTime())) {
        throw new Error('Invalid date format');
      }
      if (dob >= today) {
        throw new Error('Date of birth must be a past date');
      }
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 16) {
        throw new Error('Minimum age must be 16 years');
      }
      return true;
    }),

  body('gender')
    .trim()
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 255 }).withMessage('Address must not exceed 255 characters'),

  body('course_name')
    .trim()
    .notEmpty().withMessage('Course name is required')
    .isLength({ max: 100 }).withMessage('Course name must not exceed 100 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateStudentRegistration
};
