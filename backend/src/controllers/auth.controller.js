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

    // 1. ตรวจสอบกับรายการผู้ใช้ที่ตั้งค่าไว้ใน config / .env (Bypass 3 Roles: NDS, CDS, Admin)
    const bypassUser = config.auth.users.find(
      (u) => u.username.toLowerCase() === trimmedUsername
    );

    let tokenPayload = null;

    if (bypassUser) {
      // เป็นบัญชี Bypass -> ตรวจสอบรหัสผ่านตรงนี้
      if (bypassUser.password !== rawPassword) {
        return fail(res, 'รหัสผ่านสำหรับบัญชี Bypass ไม่ถูกต้อง', 401);
      }
      
      tokenPayload = {
        username: bypassUser.username,
        name: bypassUser.name,
        role: bypassUser.role,
        allowedTeams: bypassUser.allowedTeams,
      };
    } else {
      // 2. ถ้าไม่ใช่บัญชี Bypass -> วิ่งไปเช็คกับ SSO Server (Single View)
      // ปรับเปลี่ยนให้ใช้ Hardcode จำลองชั่วคราว (ไม่ต้องลบโค้ด SSO เดิม)
      const USE_REAL_SSO = false;

      if (!USE_REAL_SSO) {
        // --- ส่วนจำลองการ Login ด้วย Hardcode สำหรับไอดีทั่วไป (ชั่วคราว) ---
        // กำหนดให้ทุกคนที่ไม่ได้อยู่ในรายชื่อ Bypass (nds, cds, admin) ต้องใช้รหัสผ่านชั่วคราว 'password123'
        const HARDCODED_PASSWORD = 'password123';
        
        if (rawPassword !== HARDCODED_PASSWORD) {
          return fail(res, `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เปิดโหมด Hardcode ชั่วคราว - รหัสคือ ${HARDCODED_PASSWORD})`, 401);
        }

        tokenPayload = {
          username: trimmedUsername,
          name: trimmedUsername,
          role: 'sso_user', // จำลองว่าเป็น User ที่มาจาก SSO
          allowedTeams: ['nds', 'cds'],
        };
      } else {
        // --- ส่วนของ SSO ของจริง (ถูกปิดไว้ด้วย USE_REAL_SSO = false) ---
        if (!config.sso.apiUrl) {
          return fail(res, 'ระบบ SSO ยังไม่เปิดใช้งาน (ไม่พบการตั้งค่า SINGLE_VIEW_API_URL)', 500);
        }

        try {
          // [คำแนะนำ]: ปรับแก้ไข Endpoint ของ SSO ให้ตรงกับ API จริง (เช่น /api/auth/login)
          const ssoEndpoint = `${config.sso.apiUrl}/api/auth/login`; 
          
          const ssoResponse = await fetch(ssoEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RPM-Auth-Client/1.0'
            },
            body: JSON.stringify({
              username: trimmedUsername,
              password: rawPassword,
              app_name: config.sso.appName
            }),
          });

          if (!ssoResponse.ok) {
            return fail(res, 'ชื่อผู้ใช้หรือรหัสผ่าน SSO ไม่ถูกต้อง', 401);
          }

          let ssoData;
          try {
            ssoData = await ssoResponse.json();
          } catch {
            ssoData = {};
          }
          
          const userInfo = ssoData?.user_info || ssoData?.user || ssoData?.data?.user || ssoData?.data || ssoData?.result || ssoData || {};
          const ssoName = userInfo?.name || userInfo?.fullname || userInfo?.full_name || userInfo?.display_name || userInfo?.displayName || userInfo?.username || trimmedUsername;
          
          // สมมติว่า SSO ส่งข้อมูลกลับมาให้ ถอดข้อมูลมาใส่ Payload
          // ถ้า SSO ไม่ได้ส่ง Role มา จะให้สิทธิ์เป็น User ทั่วไป (เข้าได้ทั้ง NDS และ CDS ตามที่คุยกันเบื้องต้น)
          tokenPayload = {
            username: trimmedUsername,
            name: ssoName,
            role: 'sso_user',
            allowedTeams: ['nds', 'cds'], 
          };
        } catch (ssoError) {
          console.error('SSO Login Error:', ssoError.message);
          return fail(res, 'ไม่สามารถเชื่อมต่อกับระบบ SSO (Single View) ได้', 502);
        }
      }
    }

    // สร้าง Token ด้วย Payload ที่ได้ (ไม่ว่าจะเป็น Bypass หรือ SSO)
    const token = jwt.sign(tokenPayload, config.jwt.secret, config.jwt.expiresIn);

    return ok(
      res,
      {
        token,
        user: tokenPayload,
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
