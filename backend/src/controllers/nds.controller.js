const ndsService = require('../services/nds.service');
const netboxService = require('../services/netbox.service');
const { ok, created } = require('../utils/apiResponse');

// Projects
async function listProjects(req, res, next) {
  try {
    const data = await ndsService.getAllProjects();
    return ok(res, data, 'ดึงรายการโปรเจกต์ของทีม NDS สำเร็จ');
  } catch (err) { return next(err); }
}

async function getProject(req, res, next) {
  try {
    const data = await ndsService.getProjectById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'ไม่พบโปรเจกต์นี้' });
    return ok(res, data);
  } catch (err) { return next(err); }
}

async function createProject(req, res, next) {
  try {
    const data = await ndsService.createProject(req.body);
    return created(res, data, 'สร้างโปรเจกต์ของทีม NDS สำเร็จ');
  } catch (err) { return next(err); }
}

async function listDevices(req, res, next) {
  try {
    const data = await netboxService.getDevices();
    return ok(res, data, 'ดึงรายการอุปกรณ์จาก Netbox สำเร็จ');
  } catch (err) { return next(err); }
}

// CRUD Generator Helper to reduce repetitive code
function makeCrudHandlers(listFn, createFn, updateFn, deleteFn, resourceName) {
  return {
    list: async (req, res, next) => {
      try {
        const data = await listFn();
        return ok(res, data, `ดึงข้อมูล ${resourceName} สำเร็จ`);
      } catch (err) { return next(err); }
    },
    create: async (req, res, next) => {
      try {
        const data = await createFn(req.body);
        return created(res, data, `สร้าง ${resourceName} สำเร็จ`);
      } catch (err) { return next(err); }
    },
    update: async (req, res, next) => {
      try {
        const data = await updateFn(req.params.id, req.body);
        if (!data) return res.status(404).json({ success: false, message: `ไม่พบข้อมูล ${resourceName}` });
        return ok(res, data, `แก้ไข ${resourceName} สำเร็จ`);
      } catch (err) { return next(err); }
    },
    delete: async (req, res, next) => {
      try {
        const success = await deleteFn(req.params.id);
        if (!success) return res.status(404).json({ success: false, message: `ไม่พบข้อมูล ${resourceName}` });
        return ok(res, null, `ลบ/ยกเลิก ${resourceName} สำเร็จ`);
      } catch (err) { return next(err); }
    }
  };
}

const siteHandlers = makeCrudHandlers(ndsService.getAllSites, ndsService.createSite, ndsService.updateSite, ndsService.deleteSite, 'Site');
const peHandlers = makeCrudHandlers(ndsService.getAllPEs, ndsService.createPE, ndsService.updatePE, ndsService.deletePE, 'PE Device');
const lswNtHandlers = makeCrudHandlers(ndsService.getAllLswNts, ndsService.createLswNt, ndsService.updateLswNt, ndsService.deleteLswNt, 'LSW/NT Device');
const prefixHandlers = makeCrudHandlers(ndsService.getAllPrefixes, ndsService.createPrefix, ndsService.updatePrefix, ndsService.deletePrefix, 'IP Prefix');
const aggHandlers = makeCrudHandlers(ndsService.getAllAGGs, ndsService.createAGG, ndsService.updateAGG, ndsService.deleteAGG, 'AGG Device');
const domainHandlers = makeCrudHandlers(ndsService.getAllDomains, ndsService.createDomain, ndsService.updateDomain, ndsService.deleteDomain, 'Domain');
const ringHandlers = makeCrudHandlers(ndsService.getAllRings, ndsService.createRing, ndsService.updateRing, ndsService.deleteRing, 'Ring Name');

const listRegions = async (req, res, next) => {
  try {
    const regions = await ndsService.getRegions();
    return res.json({ success: true, data: regions });
  } catch (err) {
    return next(err);
  }
};

const netboxRedirect = (req, res, next) => {
  try {
    const { type, id } = req.query;
    let netboxBaseUrl = process.env.NETBOX_API_URL || 'http://localhost:8000';
    netboxBaseUrl = netboxBaseUrl.replace(/\/api\/?$/, ''); // Remove trailing /api

    let targetPath = '';
    switch (type) {
      case 'site_add':
        targetPath = '/dcim/sites/add/';
        break;
      case 'site_edit':
        targetPath = `/dcim/sites/${id}/edit/`;
        break;
      case 'site_delete':
        targetPath = `/dcim/sites/${id}/delete/`;
        break;
      case 'prefix_add':
        targetPath = '/ipam/prefixes/add/';
        break;
      case 'prefix_edit':
        targetPath = `/ipam/prefixes/${id}/edit/`;
        break;
      case 'prefix_delete':
        targetPath = `/ipam/prefixes/${id}/delete/`;
        break;
      default:
        targetPath = '/';
    }

    return res.redirect(`${netboxBaseUrl}${targetPath}`);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listProjects,
  getProject,
  createProject,
  listDevices,
  listRegions,
  netboxRedirect,
  
  // Sites
  listSites: siteHandlers.list, createSite: siteHandlers.create, updateSite: siteHandlers.update, deleteSite: siteHandlers.delete,

  // PEs
  listPEs: peHandlers.list, createPE: peHandlers.create, updatePE: peHandlers.update, deletePE: peHandlers.delete,

  // LSW/NTs
  listLswNts: lswNtHandlers.list, createLswNt: lswNtHandlers.create, updateLswNt: lswNtHandlers.update, deleteLswNt: lswNtHandlers.delete,

  // IP Prefixes
  listPrefixes: prefixHandlers.list, createPrefix: prefixHandlers.create, updatePrefix: prefixHandlers.update, deletePrefix: prefixHandlers.delete,

  // AGGs
  listAGGs: aggHandlers.list, createAGG: aggHandlers.create, updateAGG: aggHandlers.update, deleteAGG: aggHandlers.delete,

  // Domains
  listDomains: domainHandlers.list, createDomain: domainHandlers.create, updateDomain: domainHandlers.update, deleteDomain: domainHandlers.delete,

  // Rings
  listRings: ringHandlers.list, createRing: ringHandlers.create, updateRing: ringHandlers.update, deleteRing: ringHandlers.delete,
};
