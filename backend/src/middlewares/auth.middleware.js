const jwt = require('../utils/jwt');
const config = require('../config');

/**
 * Middleware ตรวจสอบ JWT Token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Missing or Invalid Token)',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง (' + err.message + ')',
    });
  }
}

/**
 * Middleware ตรวจสอบสิทธิ์การเข้าถึงทีม (NDS หรือ CDS หรือ ทั้งหมด)
 * @param {string} teamName - 'nds' หรือ 'cds'
 */
function requireTeam(teamName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ',
      });
    }

    const { role, allowedTeams = [] } = req.user;

    // Admin หรือผู้ใช้ที่ได้รับสิทธิ์ทุกทีมสามารถเข้าถึงได้ทั้งหมด
    if (role === 'admin' || allowedTeams.includes('*') || allowedTeams.includes(teamName.toLowerCase())) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `คุณไม่มีสิทธิ์เข้าถึงส่วนงานของทีม ${teamName.toUpperCase()} (สิทธิ์ของคุณ: ${allowedTeams.map(t => t.toUpperCase()).join(', ') || 'ไม่มีสิทธิ์'})`,
    });
  };
}

module.exports = {
  verifyToken,
  requireTeam,
};
