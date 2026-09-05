import axios from 'axios';

/**
 * ค่าเริ่มต้นใช้ '/api' เพื่อวิ่งผ่าน proxy ของ Vite (ไม่ติด CORS)
 * ถ้าต้องการชี้ไป backend ตัวอื่น ตั้งค่า VITE_API_BASE_URL ใน client/.env
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** ดึงข้อความ error ที่อ่านรู้เรื่องออกมาจาก axios error */
export function getErrorMessage(err) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ECONNABORTED') return 'เชื่อมต่อเซิร์ฟเวอร์นานเกินไป กรุณาลองใหม่';
  if (err?.message === 'Network Error') {
    return 'เชื่อมต่อ API ไม่ได้ — ตรวจสอบว่ารัน backend ที่ http://localhost:4000 แล้วหรือยัง';
  }
  return err?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
}

/* ---------------------------- Products ---------------------------- */
export const getProducts = (params = {}) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const getLowStock = (threshold = 5) => api.get('/products/low-stock', { params: { threshold } });

/* ------------------------------ Stock ----------------------------- */
export const adjustStock = (data) => api.patch('/stock/adjust', data);
export const getTransactions = (params = {}) => api.get('/stock/transactions', { params });

/* ---------------------------- Categories -------------------------- */
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);

/* ----------------------------- Health ----------------------------- */
export const getHealth = () => api.get('/health');

export default api;
