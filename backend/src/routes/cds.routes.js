const express = require('express');
const cdsController = require('../controllers/cds.controller');

const router = express.Router();

// GET    /api/cds/projects        → รายการโปรเจกต์ทั้งหมดของทีม CDS
// GET    /api/cds/projects/:id    → รายละเอียดโปรเจกต์เดียว
// POST   /api/cds/projects        → สร้างโปรเจกต์ใหม่
router.get('/projects', cdsController.listProjects);
router.get('/projects/:id', cdsController.getProject);
router.post('/projects', cdsController.createProject);

// TODO (ต่อยอด): เพิ่ม route อื่นของทีม CDS ตรงนี้ เช่น
// router.get('/devices', cdsController.listDevices);
// router.get('/topology', cdsController.getTopology);

module.exports = router;
