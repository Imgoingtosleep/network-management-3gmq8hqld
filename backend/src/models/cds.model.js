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

async function addDashboardItem(item) {
  cdsDashboardData.unshift(item);
  return item;
}

async function updateDashboardItem(id, updates) {
  const index = cdsDashboardData.findIndex(item => 
    String(item.id) === String(id) || 
    String(item.access_lsw_id) === String(id) || 
    String(item.nodeId) === String(id)
  );
  if (index === -1) return null;
  
  cdsDashboardData[index] = { ...cdsDashboardData[index], ...updates };
  return cdsDashboardData[index];
}

module.exports = { findAll, findById, create, getDashboardData, addDashboardItem, updateDashboardItem };
