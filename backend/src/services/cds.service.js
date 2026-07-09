const cdsModel = require('../models/cds.model');

/**
 * Service layer ของทีม CDS
 */

async function getAllProjects() {
  return cdsModel.findAll();
}

async function getProjectById(id) {
  return cdsModel.findById(id);
}

async function createProject(payload) {
  if (!payload?.name) {
    const err = new Error('กรุณาระบุชื่อโปรเจกต์ (name)');
    err.status = 400;
    throw err;
  }
  return cdsModel.create(payload);
}

module.exports = { getAllProjects, getProjectById, createProject };
