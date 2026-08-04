import axiosClient from './axiosClient';

// Helper to generate typical CRUD request bindings
const makeCrudApi = (path) => ({
  list: () => axiosClient.get(`/nds/${path}`),
  create: (payload) => axiosClient.post(`/nds/${path}`, payload),
  update: (id, payload) => axiosClient.put(`/nds/${path}/${id}`, payload),
  delete: (id) => axiosClient.delete(`/nds/${path}/${id}`),
});

export const ndsApi = {
  getProjects: () => axiosClient.get('/nds/projects'),
  getProject: (id) => axiosClient.get(`/nds/projects/${id}`),
  createProject: (payload) => axiosClient.post('/nds/projects', payload),
  getDevices: () => axiosClient.get('/nds/devices'),
  getDeviceInterfaces: (id) => axiosClient.get(`/nds/devices/${id}/interfaces`),
  updateDeviceInterface: (id, payload) => axiosClient.patch(`/nds/interfaces/${id}`, payload),
  createDevice: (payload) => axiosClient.post('/nds/devices', payload),
  syncDeviceInterfaces: (payload) => axiosClient.post('/nds/devices/sync-interfaces', payload),
  updateDevice: (id, payload) => axiosClient.put(`/nds/devices/${id}`, payload),
  deleteDevice: (id) => axiosClient.delete(`/nds/devices/${id}`),
  getRegions: () => axiosClient.get('/nds/regions'),
  getDeviceTypes: () => axiosClient.get('/nds/device-types'),
  createDeviceType: (payload) => axiosClient.post('/nds/device-types', payload),
  createInterfaceTemplates: (id, payload) => axiosClient.post(`/nds/device-types/${id}/interfaces`, payload),
  getInterfaceTemplates: (id) => axiosClient.get(`/nds/device-types/${id}/interfaces`),
  getPortPresets: () => axiosClient.get('/nds/port-presets'),
  createPortPreset: (payload) => axiosClient.post('/nds/port-presets', payload),
  getInterfaceTypeChoices: () => axiosClient.get('/nds/interface-type-choices'),
  getDeviceRoles: () => axiosClient.get('/nds/device-roles'),
  getTenants: () => axiosClient.get('/nds/tenants'),
  getLocations: () => axiosClient.get('/nds/locations'),
  getRacks: () => axiosClient.get('/nds/racks'),
  getPlatforms: () => axiosClient.get('/nds/platforms'),
  getConfigTemplates: () => axiosClient.get('/nds/config-templates'),
  getClusters: () => axiosClient.get('/nds/clusters'),
  getTenantGroups: () => axiosClient.get('/nds/tenant-groups'),
  getVirtualChassises: () => axiosClient.get('/nds/virtual-chassises'),
  getTags: () => axiosClient.get('/nds/tags'),
  getVlans: () => axiosClient.get('/nds/vlans'),
  replaceDevice: (payload) => axiosClient.post('/nds/devices/replace', payload),

  // Module Bays & Module Types
  getModuleTypes: () => axiosClient.get('/nds/module-types'),
  getDeviceModuleBays: (deviceId) => axiosClient.get(`/nds/devices/${deviceId}/module-bays`),
  installModuleInBay: (payload) => axiosClient.post('/nds/module-bays/install', payload),
  removeModuleFromBay: (moduleId) => axiosClient.delete(`/nds/modules/${moduleId}`),

  // CRUD Bindings
  sites: makeCrudApi('sites'),
  pes: makeCrudApi('pes'),
  lswNts: makeCrudApi('lsw_nts'),
  prefixes: makeCrudApi('prefixes'),
  aggs: makeCrudApi('aggs'),
  domains: makeCrudApi('domains'),
  rings: makeCrudApi('rings'),
};
