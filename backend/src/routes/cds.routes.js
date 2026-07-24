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
router.get('/dashboard', cdsController.getDashboardData);
router.post('/dashboard', cdsController.addDashboardData);
router.patch('/dashboard/:id', cdsController.updateDashboardData);
router.get('/vlans', cdsController.listVlans);
router.post('/vlans', cdsController.createVlan);
router.get('/vlan-roles', cdsController.listVlanRoles);
router.get('/vlan-groups', cdsController.listVlanGroups);
router.get('/topology', cdsController.getSiteTopology);
router.get('/topology/:site_code', cdsController.getSiteTopology);
router.get('/path-trace', cdsController.getPathTrace);
router.get('/device-details/:id', cdsController.getDeviceDetails);
router.get('/available-ips', cdsController.getAvailableIps);

module.exports = router;
