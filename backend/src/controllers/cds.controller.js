const cdsService = require('../services/cds.service');
const netboxService = require('../services/netbox.service');
const { ok, created } = require('../utils/apiResponse');

async function listProjects(req, res, next) {
  try {
    const data = await cdsService.getAllProjects();
    return ok(res, data, 'ดึงรายการโปรเจกต์ของทีม CDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const data = await cdsService.getProjectById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'ไม่พบโปรเจกต์นี้' });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const data = await cdsService.createProject(req.body);
    return created(res, data, 'สร้างโปรเจกต์ของทีม CDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function listPrefixes(req, res, next) {
  try {
    const data = await netboxService.getPrefixes();
    return ok(res, data, 'ดึงรายการ IP Prefixes จาก Netbox สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function listSites(req, res, next) {
  try {
    const data = await netboxService.getSites();
    return ok(res, data, 'ดึงรายการ Sites จาก Netbox สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function listIpAddresses(req, res, next) {
  try {
    const data = await netboxService.getIpAddresses();
    return ok(res, data, 'ดึงรายการ IP Addresses จาก Netbox สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getDashboardData(req, res, next) {
  try {
    const data = await cdsService.getDashboardData();
    return ok(res, data, 'ดึงรายการแดชบอร์ด CDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function listVlans(req, res, next) {
  try {
    const data = await netboxService.getVlans();
    return ok(res, data, 'ดึงรายการ VLANs จาก Netbox สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function addDashboardData(req, res, next) {
  try {
    const data = await cdsService.addDashboardData(req.body);
    return created(res, data, 'เพิ่มข้อมูลแดชบอร์ด CDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getSiteTopology(req, res, next) {
  try {
    const siteCode = req.query.site || req.params.site_code || '';
    const topologyData = await cdsService.getSiteTopology(siteCode);
    return ok(res, topologyData, 'ดึงข้อมูล Site Topology สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getPathTrace(req, res, next) {
  try {
    const query = req.query.ip || req.query.query || req.params.query || '';
    const traceData = await cdsService.getPathTrace(query);
    return ok(res, traceData, 'ดึงข้อมูล Path Trace สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getDeviceDetails(req, res, next) {
  try {
    const data = await cdsService.getDeviceDetails(req.params.id);
    return ok(res, data, 'ดึงรายละเอียดอุปกรณ์สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

module.exports = { listProjects, getProject, createProject, listPrefixes, listSites, listIpAddresses, getDashboardData, listVlans, addDashboardData, getSiteTopology, getPathTrace, getDeviceDetails };
