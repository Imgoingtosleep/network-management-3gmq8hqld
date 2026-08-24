const express = require('express');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /api/auth/login -> เข้าสู่ระบบ
router.post('/login', authController.login);

// GET  /api/auth/info  -> ข้อมูลบัญชีผู้ใช้และทีม
router.get('/info', authController.getLoginInfo);

// GET  /api/auth/me    -> ดึงข้อมูลบัญชีผู้ใช้ที่ล็อกอินอยู่ (ต้องใช้ Token)
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
