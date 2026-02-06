import axios from 'axios';

// Tạo một instance dùng chung cho cả app
const api = axios.create({
  // Sửa cứng luôn cái giá trị mặc định này cho chắc ăn
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://sotvdi.umtoj.edu.vn/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;