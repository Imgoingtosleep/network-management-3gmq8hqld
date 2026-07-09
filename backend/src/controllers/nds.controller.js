const ndsService = require('../services/nds.service');
const { ok, created } = require('../utils/apiResponse');

async function listProjects(req, res, next) {
  try {
    const data = await ndsService.getAllProjects();
    return ok(res, data, 'ดึงรายการโปรเจกต์ของทีม NDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const data = await ndsService.getProjectById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'ไม่พบโปรเจกต์นี้' });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const data = await ndsService.createProject(req.body);
    return created(res, data, 'สร้างโปรเจกต์ของทีม NDS สำเร็จ');
  } catch (err) {
    return next(err);
  }
}

module.exports = { listProjects, getProject, createProject };
