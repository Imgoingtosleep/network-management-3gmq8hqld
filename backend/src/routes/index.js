const express = require('express');
const authRoutes = require('./auth.routes');
const ndsRoutes = require('./nds.routes');
const cdsRoutes = require('./cds.routes');
const { verifyToken, requireTeam } = require('../middlewares/auth.middleware');

const router = express.Router();

// Health check กลาง — ใช้เช็คว่า API ยังทำงานอยู่
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'network-portal API is healthy', timestamp: new Date().toISOString() });
});

// Authentication routes (Login / Me)
// => /api/auth/login
// => /api/auth/me
// => /api/auth/info
router.use('/auth', authRoutes);

// แยก path ตามทีมตั้งแต่ระดับ router พร้อมการตรวจสิทธิ์
// => /api/nds/* (ต้องมีสิทธิ์ทีม NDS หรือ Admin)
// => /api/cds/* (ต้องมีสิทธิ์ทีม CDS หรือ Admin)
router.use('/nds', verifyToken, requireTeam('nds'), ndsRoutes);
router.use('/cds', verifyToken, requireTeam('cds'), cdsRoutes);

module.exports = router;
