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
  createDevice: (payload) => axiosClient.post('/nds/devices', payload),
  updateDevice: (id, payload) => axiosClient.put(`/nds/devices/${id}`, payload),
  deleteDevice: (id) => axiosClient.delete(`/nds/devices/${id}`),
  getRegions: () => axiosClient.get('/nds/regions'),
  getDeviceTypes: () => axiosClient.get('/nds/device-types'),
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

  // CRUD Bindings
  sites: makeCrudApi('sites'),
  pes: makeCrudApi('pes'),
  lswNts: makeCrudApi('lsw_nts'),
  prefixes: makeCrudApi('prefixes'),
  aggs: makeCrudApi('aggs'),
  domains: makeCrudApi('domains'),
  rings: makeCrudApi('rings'),
};
