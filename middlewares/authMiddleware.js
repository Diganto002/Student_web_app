const ADMIN_TOKEN = 'admin-token-spectrum-authenticated-2026';

/**
 * verify Admin Authentication Token
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

module.exports = {
  ADMIN_TOKEN,
  verifyAdminToken
};
