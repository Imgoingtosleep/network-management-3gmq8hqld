// In-memory mock data for NDS Network Management
let ndsProjects = [
  { id: 1, name: 'Core Network Redesign - Site A', status: 'in_progress', owner: 'NDS Team', updatedAt: new Date().toISOString() },
  { id: 2, name: 'WAN Link Capacity Planning', status: 'planned', owner: 'NDS Team', updatedAt: new Date().toISOString() }
];

let ndsSites = [
  { id: 1, name: 'Bangkok Core (BKK-01)', location: 'Bangkok', description: 'Main Headquarter Site' },
  { id: 2, name: 'Chiang Mai Edge (CNX-02)', location: 'Chiang Mai', description: 'Northern Region Hub' },
  { id: 3, name: 'Phuket Edge (HKT-03)', location: 'Phuket', description: 'Southern Region Hub' }
];

let ndsPEs = [
  { id: 1, name: 'bkk-pe-01', model: 'Cisco ASR 9010', ip: '10.255.0.1', siteId: 1, status: 'Active' },
  { id: 2, name: 'cnx-pe-01', model: 'Huawei NE40E', ip: '10.255.0.2', siteId: 2, status: 'Active' }
];

let ndsLswNts = [
  { id: 1, name: 'bkk-lsw-10a', type: 'LSW', model: 'Catalyst 9300', ip: '10.10.10.11', siteId: 1, status: 'Active' },
  { id: 2, name: 'cnx-nt-20b', type: 'NT', model: 'Nokia 7210', ip: '10.20.10.12', siteId: 2, status: 'Active' }
];

let ndsIpPrefixes = [
  { id: 1, prefix: '10.10.0.0/16', vlan: 100, siteId: 1, description: 'BKK Office LAN' },
  { id: 2, prefix: '10.20.0.0/16', vlan: 200, siteId: 2, description: 'CNX Office LAN' }
];

let ndsAGGs = [
  { id: 1, name: 'bkk-agg-01', model: 'Nexus 9300', ip: '10.100.0.1', siteId: 1, status: 'Active' },
  { id: 2, name: 'cnx-agg-01', model: 'Nexus 9300', ip: '10.100.0.2', siteId: 2, status: 'Active' }
];

let ndsDomains = [
  { id: 1, name: 'Core Domain', code: 'DOM-CORE', type: 'IGP' },
  { id: 2, name: 'Access Domain 01', code: 'DOM-ACC-01', type: 'OSPF' }
];

let ndsRingNames = [
  { id: 1, ringName: 'BKK-METRO-RING-01', aggId: 1, domainId: 1, bandwidth: '100G' },
  { id: 2, ringName: 'CNX-NORTH-RING-02', aggId: 2, domainId: 2, bandwidth: '10G' }
];

let ndsPortPresets = [
  { id: 1, name: "24x 1G Copper + 4x 10G SFP+", ranges: [
    { prefix: "GigabitEthernet0/0/", start: 1, count: 24, type: "1000base-t" },
    { prefix: "TenGigabitEthernet0/1/", start: 1, count: 4, type: "10gbase-x-sfpp" }
  ]},
  { id: 2, name: "48x 1G Copper + 4x 10G SFP+", ranges: [
    { prefix: "GigabitEthernet0/0/", start: 1, count: 48, type: "1000base-t" },
    { prefix: "TenGigabitEthernet0/1/", start: 1, count: 4, type: "10gbase-x-sfpp" }
  ]},
  { id: 3, name: "20x 1G Fiber + 4x 10G SFP+ (Combo)", ranges: [
    { prefix: "GigabitEthernet0/0/", start: 0, count: 20, type: "1000base-x-sfp" },
    { prefix: "TenGigabitEthernet0/1/", start: 1, count: 4, type: "10gbase-x-sfpp" }
  ]}
];

// Helper functions for CRUD operations
function createHelper(list, payload) {
  const newItem = {
    id: list.length ? Math.max(...list.map(x => x.id)) + 1 : 1,
    ...payload
  };
  list.push(newItem);
  return newItem;
}

function updateHelper(list, id, payload) {
  const index = list.findIndex(x => x.id === Number(id));
  if (index === -1) return null;
  list[index] = { ...list[index], ...payload, id: Number(id) };
  return list[index];
}

function deleteHelper(list, id) {
  const index = list.findIndex(x => x.id === Number(id));
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}

module.exports = {
  // Projects
  findAll: async () => ndsProjects,
  findById: async (id) => ndsProjects.find(p => p.id === Number(id)) || null,
  create: async (payload) => createHelper(ndsProjects, { status: 'planned', updatedAt: new Date().toISOString(), ...payload }),

  // Sites
  findSites: async () => ndsSites,
  createSite: async (payload) => createHelper(ndsSites, payload),
  updateSite: async (id, payload) => updateHelper(ndsSites, id, payload),
  deleteSite: async (id) => deleteHelper(ndsSites, id),

  // PEs
  findPEs: async () => ndsPEs,
  createPE: async (payload) => createHelper(ndsPEs, payload),
  updatePE: async (id, payload) => updateHelper(ndsPEs, id, payload),
  deletePE: async (id) => deleteHelper(ndsPEs, id),

  // LSW/NTs
  findLswNts: async () => ndsLswNts,
  createLswNt: async (payload) => createHelper(ndsLswNts, payload),
  updateLswNt: async (id, payload) => updateHelper(ndsLswNts, id, payload),
  deleteLswNt: async (id) => deleteHelper(ndsLswNts, id),

  // IP Prefix
  findPrefixes: async () => ndsIpPrefixes,
  createPrefix: async (payload) => createHelper(ndsIpPrefixes, payload),
  updatePrefix: async (id, payload) => updateHelper(ndsIpPrefixes, id, payload),
  deletePrefix: async (id) => deleteHelper(ndsIpPrefixes, id),

  // AGGs
  findAGGs: async () => ndsAGGs,
  createAGG: async (payload) => createHelper(ndsAGGs, payload),
  updateAGG: async (id, payload) => updateHelper(ndsAGGs, id, payload),
  deleteAGG: async (id) => deleteHelper(ndsAGGs, id),

  // Domains
  findDomains: async () => ndsDomains,
  createDomain: async (payload) => createHelper(ndsDomains, payload),
  updateDomain: async (id, payload) => updateHelper(ndsDomains, id, payload),
  deleteDomain: async (id) => deleteHelper(ndsDomains, id),

  // Ring Names
  findRings: async () => ndsRingNames,
  createRing: async (payload) => createHelper(ndsRingNames, payload),
  updateRing: async (id, payload) => updateHelper(ndsRingNames, id, payload),
  deleteRing: async (id) => deleteHelper(ndsRingNames, id),

  // Port Presets
  findPortPresets: async () => ndsPortPresets,
  createPortPreset: async (payload) => createHelper(ndsPortPresets, payload),
};
