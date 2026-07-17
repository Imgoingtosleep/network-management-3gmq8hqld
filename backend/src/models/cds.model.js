/**
 * Model ของทีม CDS (Customer Design Service)
 * ตอนนี้เป็น in-memory mock data — พร้อมสลับไปใช้ฐานข้อมูลจริงในอนาคต
 */

let cdsProjects = [];

async function findAll() {
  return cdsProjects;
}

async function findById(id) {
  return cdsProjects.find((p) => p.id === Number(id)) || null;
}

async function create(payload) {
  const newItem = {
    id: cdsProjects.length ? Math.max(...cdsProjects.map((p) => p.id)) + 1 : 1,
    status: 'planned',
    updatedAt: new Date().toISOString(),
    ...payload,
  };
  cdsProjects.push(newItem);
  return newItem;
}

let cdsDashboardData = [];

async function getDashboardData() {
  return cdsDashboardData;
}

module.exports = { findAll, findById, create, getDashboardData };
