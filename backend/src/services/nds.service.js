const ndsModel = require('../models/nds.model');

/**
 * Service layer ของทีม NDS
 * เก็บ business logic ไว้ที่นี่ แยกออกจาก controller (route handling)
 * และแยกออกจาก model (data access) — เพื่อให้ทดสอบและต่อยอดง่าย
 */

async function getAllProjects() {
  return ndsModel.findAll();
}

async function getProjectById(id) {
  return ndsModel.findById(id);
}

async function createProject(payload) {
  if (!payload?.name) {
    const err = new Error('กรุณาระบุชื่อโปรเจกต์ (name)');
    err.status = 400;
    throw err;
  }
  return ndsModel.create(payload);
}

module.exports = { getAllProjects, getProjectById, createProject };
