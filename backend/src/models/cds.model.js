/**
 * Model ของทีม CDS (Core Design Services)
 * ตอนนี้เป็น in-memory mock data — พร้อมสลับไปใช้ฐานข้อมูลจริงในอนาคต
 */

let cdsProjects = [
  {
    id: 1,
    name: 'Core Router Firmware Upgrade',
    status: 'in_progress',
    owner: 'CDS Team',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Data Center Interconnect Redesign',
    status: 'planned',
    owner: 'CDS Team',
    updatedAt: new Date().toISOString(),
  },
];

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

module.exports = { findAll, findById, create };
