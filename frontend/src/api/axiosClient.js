import axios from 'axios';

// อ่านค่า base URL ของ backend จาก .env (VITE_API_BASE_URL)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export default axiosClient;
