const express = require('express');
const cdsController = require('../controllers/cds.controller');

const router = express.Router();

// GET    /api/cds/projects        → รายการโปรเจกต์ทั้งหมดของทีม CDS
// GET    /api/cds/projects/:id    → รายละเอียดโปรเจกต์เดียว
// POST   /api/cds/projects        → สร้างโปรเจกต์ใหม่
router.get('/projects', cdsController.listProjects);
router.get('/projects/:id', cdsController.getProject);
router.post('/projects', cdsController.createProject);

router.get('/prefixes', cdsController.listPrefixes);
router.get('/sites', cdsController.listSites);
router.get('/ip-addresses', cdsController.listIpAddresses);

module.exports = router;
