const express = require('express');
const ndsController = require('../controllers/nds.controller');

const router = express.Router();

// Projects
router.get('/projects', ndsController.listProjects);
router.get('/projects/:id', ndsController.getProject);
router.post('/projects', ndsController.createProject);

// NetBox Devices (API connection)
router.get('/devices', ndsController.listDevices);
router.post('/devices/sync-interfaces', ndsController.syncDeviceInterfaces);
router.post('/devices/replace', ndsController.replaceDevice);
router.get('/devices/:id/interfaces', ndsController.listDeviceInterfaces);
router.patch('/interfaces/:interfaceId', ndsController.updateDeviceInterface);
router.post('/devices', ndsController.createDevice);
router.put('/devices/:id', ndsController.updateDevice);
router.delete('/devices/:id', ndsController.deleteDevice);
router.get('/regions', ndsController.listRegions);
router.get('/netbox-redirect', ndsController.netboxRedirect);

// Metadata Helpers for forms
router.get('/device-types', ndsController.listDeviceTypes);
router.post('/device-types', ndsController.createDeviceType);
router.get('/device-types/:id/interfaces', ndsController.listInterfaceTemplates);
router.post('/device-types/:id/interfaces', ndsController.createInterfaceTemplates);
router.get('/port-presets', ndsController.listPortPresets);
router.post('/port-presets', ndsController.createPortPreset);
router.get('/interface-type-choices', ndsController.listInterfaceTypeChoices);
router.get('/device-roles', ndsController.listDeviceRoles);
router.get('/tenants', ndsController.listTenants);
router.get('/locations', ndsController.listLocations);
router.get('/racks', ndsController.listRacks);
router.get('/platforms', ndsController.listPlatforms);
router.get('/config-templates', ndsController.listConfigTemplates);
router.get('/clusters', ndsController.listClusters);
router.get('/tenant-groups', ndsController.listTenantGroups);
router.get('/virtual-chassises', ndsController.listVirtualChassises);
router.get('/tags', ndsController.listTags);
router.get('/vlans', ndsController.listVlans);

// Module Bays & Module Types
router.get('/module-types', ndsController.listModuleTypes);
router.get('/module-types/:id/interfaces', ndsController.getModuleTypeInterfaces);
router.get('/devices/:id/module-bays', ndsController.listDeviceModuleBays);
router.post('/module-bays/install', ndsController.installModuleInBay);
router.delete('/modules/:moduleId', ndsController.removeModuleFromBay);

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
