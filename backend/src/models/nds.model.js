/**
 * Model ของทีม NDS (Network Design Services)
 * ตอนนี้เป็น in-memory mock data — พร้อมสลับไปใช้ฐานข้อมูลจริงในอนาคต
 * โดยคง interface ของฟังก์ชันเดิมไว้ (findAll, findById, create, ...)
 */

let ndsProjects = [
  {
    id: 1,
    name: 'Core Network Redesign - Site A',
    status: 'in_progress',
    owner: 'NDS Team',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'WAN Link Capacity Planning',
    status: 'planned',
    owner: 'NDS Team',
    updatedAt: new Date().toISOString(),
  },
];

async function findAll() {
  return ndsProjects;
}

async function findById(id) {
  return ndsProjects.find((p) => p.id === Number(id)) || null;
}

async function create(payload) {
  const newItem = {
    id: ndsProjects.length ? Math.max(...ndsProjects.map((p) => p.id)) + 1 : 1,
    status: 'planned',
    updatedAt: new Date().toISOString(),
    ...payload,
  };
  ndsProjects.push(newItem);
  return newItem;
}

module.exports = { findAll, findById, create };
