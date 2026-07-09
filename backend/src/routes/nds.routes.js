const express = require('express');
const ndsController = require('../controllers/nds.controller');

const router = express.Router();

// Projects
router.get('/projects', ndsController.listProjects);
router.get('/projects/:id', ndsController.getProject);
router.post('/projects', ndsController.createProject);

// NetBox Devices (API connection)
router.get('/devices', ndsController.listDevices);
router.get('/regions', ndsController.listRegions);

// NDS CRUD Routes
const registerCrud = (path, singular, plural) => {
  router.get(`/${path}`, ndsController[`list${plural}`]);
  router.post(`/${path}`, ndsController[`create${singular}`]);
  router.put(`/${path}/:id`, ndsController[`update${singular}`]);
  router.delete(`/${path}/:id`, ndsController[`delete${singular}`]);
};

registerCrud('sites', 'Site', 'Sites');
registerCrud('pes', 'PE', 'PEs');
registerCrud('lsw_nts', 'LswNt', 'LswNts');
registerCrud('prefixes', 'Prefix', 'Prefixes');
registerCrud('aggs', 'AGG', 'AGGs');
registerCrud('domains', 'Domain', 'Domains');
registerCrud('rings', 'Ring', 'Rings');

module.exports = router;
