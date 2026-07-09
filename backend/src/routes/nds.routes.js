const express = require('express');
const ndsController = require('../controllers/nds.controller');

const router = express.Router();

// GET    /api/nds/projects        → รายการโปรเจกต์ทั้งหมดของทีม NDS
// GET    /api/nds/projects/:id    → รายละเอียดโปรเจกต์เดียว
// POST   /api/nds/projects        → สร้างโปรเจกต์ใหม่
router.get('/projects', ndsController.listProjects);
router.get('/projects/:id', ndsController.getProject);
router.post('/projects', ndsController.createProject);

// TODO (ต่อยอด): เพิ่ม route อื่นของทีม NDS ตรงนี้ เช่น
// router.get('/devices', ndsController.listDevices);
// router.get('/topology', ndsController.getTopology);

module.exports = router;
