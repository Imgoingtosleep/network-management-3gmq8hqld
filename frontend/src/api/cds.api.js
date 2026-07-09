import axiosClient from './axiosClient';

// รวมฟังก์ชันเรียก API ของทีม CDS ไว้ที่นี่ที่เดียว
export const cdsApi = {
  getProjects: () => axiosClient.get('/cds/projects'),
  getProject: (id) => axiosClient.get(`/cds/projects/${id}`),
  createProject: (payload) => axiosClient.post('/cds/projects', payload),
};
