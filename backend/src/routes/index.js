const express = require('express');
const ndsRoutes = require('./nds.routes');
const cdsRoutes = require('./cds.routes');

const router = express.Router();

// Health check กลาง — ใช้เช็คว่า API ยังทำงานอยู่
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'network-portal API is healthy', timestamp: new Date().toISOString() });
});

// แยก path ตามทีมตั้งแต่ระดับ router
// => /api/nds/*
// => /api/cds/*
router.use('/nds', ndsRoutes);
router.use('/cds', cdsRoutes);

// TODO (ต่อยอด): เมื่อมีทีมใหม่ ให้เพิ่มบรรทัดแบบนี้
// const newTeamRoutes = require('./new-team.routes');
// router.use('/new-team', newTeamRoutes);

module.exports = router;
