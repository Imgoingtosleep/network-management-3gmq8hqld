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
  getRegions: () => axiosClient.get('/nds/regions'),

  // CRUD Bindings
  sites: makeCrudApi('sites'),
  pes: makeCrudApi('pes'),
  lswNts: makeCrudApi('lsw_nts'),
  prefixes: makeCrudApi('prefixes'),
  aggs: makeCrudApi('aggs'),
  domains: makeCrudApi('domains'),
  rings: makeCrudApi('rings'),
};
