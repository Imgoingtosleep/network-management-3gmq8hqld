const config = require('../config');
const jwt = require('../utils/jwt');
const { ok, fail } = require('../utils/apiResponse');

/**
 * จัดการการเข้าสู่ระบบ (Login)
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return fail(res, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 400);
    }

    const trimmedUsername = String(username).trim().toLowerCase();
    const rawPassword = String(password);

    // ตรวจสอบกับรายการผู้ใช้ที่ตั้งค่าไว้ใน config / .env
    const matchedUser = config.auth.users.find(
      (u) => u.username.toLowerCase() === trimmedUsername && u.password === rawPassword
    );

    if (!matchedUser) {
      return fail(res, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบข้อมูลอีกครั้ง', 401);
    }

    // สร้าง payload สำหรับ token
    const tokenPayload = {
      username: matchedUser.username,
      name: matchedUser.name,
      role: matchedUser.role,
      allowedTeams: matchedUser.allowedTeams,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, config.jwt.expiresIn);

    return ok(
      res,
      {
        token,
        user: {
          username: matchedUser.username,
          name: matchedUser.name,
          role: matchedUser.role,
          allowedTeams: matchedUser.allowedTeams,
        },
      },
      'เข้าสู่ระบบสำเร็จ'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบันจาก Token (Me)
 */
async function getMe(req, res, next) {
  try {
    return ok(res, { user: req.user }, 'ดึงข้อมูลโปรไฟล์สำเร็จ');
  } catch (err) {
    next(err);
  }
}

/**
 * ดึงข้อมูลสิทธิ์และชื่อทีมที่รองรับ (สำหรับแสดงบนหน้า Login)
 */
async function getLoginInfo(req, res, next) {
  try {
    const publicAccounts = config.auth.users.map((u) => ({
      username: u.username,
      name: u.name,
      role: u.role,
      allowedTeams: u.allowedTeams,
    }));
    return ok(res, { accounts: publicAccounts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  getLoginInfo,
};
