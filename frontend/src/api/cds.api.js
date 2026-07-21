import axiosClient from './axiosClient';

// รวมฟังก์ชันเรียก API ของทีม CDS ไว้ที่นี่ที่เดียว
export const cdsApi = {
  getProjects: () => axiosClient.get('/cds/projects'),
  getProject: (id) => axiosClient.get(`/cds/projects/${id}`),
  createProject: (payload) => axiosClient.post('/cds/projects', payload),
  getPrefixes: () => axiosClient.get('/cds/prefixes'),
  getSites: () => axiosClient.get('/cds/sites'),
  getIpAddresses: () => axiosClient.get('/cds/ip-addresses'),
  getDashboard: () => axiosClient.get('/cds/dashboard'),
  addDashboard: (payload) => axiosClient.post('/cds/dashboard', payload),
  getVlans: () => axiosClient.get('/cds/vlans'),
  getSiteTopology: (siteCode = '') => axiosClient.get(`/cds/topology${siteCode ? `/${encodeURIComponent(siteCode)}` : ''}`),
  getPathTrace: (query = '') => axiosClient.get(`/cds/path-trace?query=${encodeURIComponent(query)}`),
  getDeviceDetails: (id) => axiosClient.get(`/cds/device-details/${id}`),
  getAvailableIps: (prefix = '') => axiosClient.get(`/cds/available-ips?prefix=${encodeURIComponent(prefix)}`),
};
