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

module.exports = { listProjects, getProject, createProject, listPrefixes, listSites, listIpAddresses };
