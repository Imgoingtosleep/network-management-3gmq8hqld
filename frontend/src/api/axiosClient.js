import axios from 'axios';

// อ่านค่า base URL ของ backend จาก .env (VITE_API_BASE_URL)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2500/api';

const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// แนบ JWT Token เข้าไปใน Authorization Header ทุกคำขอโดยอัตโนมัติ
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ดักจับ response error หาก token หมดอายุหรือไม่ถูกต้อง
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
