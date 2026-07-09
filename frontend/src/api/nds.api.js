import axiosClient from './axiosClient';

// รวมฟังก์ชันเรียก API ของทีม NDS ไว้ที่นี่ที่เดียว
export const ndsApi = {
  getProjects: () => axiosClient.get('/nds/projects'),
  getProject: (id) => axiosClient.get(`/nds/projects/${id}`),
  createProject: (payload) => axiosClient.post('/nds/projects', payload),
};
