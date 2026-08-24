const { ADMIN_TOKEN } = require('../middlewares/authMiddleware');

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

    // Accepts both spetrum / spectrum with password admin123
    if ((u === 'spetrum' || u === 'spectrum') && p === 'admin123') {
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
